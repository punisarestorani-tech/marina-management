-- Marina Management System - Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('inspector', 'operator', 'manager', 'admin')),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'inspector')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================
-- PONTOONS TABLE
-- =====================
CREATE TABLE pontoons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  geometry JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- BERTHS TABLE
-- =====================
CREATE TABLE berths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pontoon_id UUID REFERENCES pontoons(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  polygon JSONB NOT NULL,
  width DECIMAL(5,2),
  length DECIMAL(5,2),
  max_draft DECIMAL(4,2),
  daily_rate DECIMAL(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pontoon_id, code)
);

-- =====================
-- VESSELS TABLE
-- =====================
CREATE TABLE vessels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_number TEXT UNIQUE NOT NULL,
  name TEXT,
  type TEXT CHECK (type IN ('sailboat', 'motorboat', 'yacht', 'catamaran', 'other')),
  length DECIMAL(5,2),
  width DECIMAL(5,2),
  draft DECIMAL(4,2),
  owner_name TEXT,
  owner_contact TEXT,
  flag_country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- DAILY OCCUPANCY TABLE
-- =====================
CREATE TABLE daily_occupancy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  berth_id UUID NOT NULL REFERENCES berths(id) ON DELETE CASCADE,
  vessel_id UUID REFERENCES vessels(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('occupied', 'free', 'reserved')),
  photo_url TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  UNIQUE(berth_id, date)
);

-- =====================
-- LEASE CONTRACTS TABLE
-- =====================
CREATE TABLE lease_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  berth_id UUID NOT NULL REFERENCES berths(id) ON DELETE RESTRICT,
  vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE RESTRICT,
  owner_name TEXT NOT NULL,
  owner_email TEXT,
  owner_phone TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  annual_price DECIMAL(12,2) NOT NULL,
  payment_schedule TEXT CHECK (payment_schedule IN ('monthly', 'quarterly', 'annual', 'upfront')),
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- PAYMENTS TABLE
-- =====================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES lease_contracts(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- VIOLATIONS TABLE
-- =====================
CREATE TABLE violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  berth_id UUID NOT NULL REFERENCES berths(id) ON DELETE CASCADE,
  vessel_id UUID REFERENCES vessels(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('unpaid_occupancy', 'no_contract', 'overstay', 'size_violation', 'other')),
  description TEXT,
  detected_date DATE NOT NULL,
  resolved_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  detected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- AUDIT LOG TABLE
-- =====================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX idx_berths_pontoon ON berths(pontoon_id);
CREATE INDEX idx_berths_status ON berths(status);
CREATE INDEX idx_daily_occupancy_date ON daily_occupancy(date);
CREATE INDEX idx_daily_occupancy_berth_date ON daily_occupancy(berth_id, date);
CREATE INDEX idx_vessels_registration ON vessels(registration_number);
CREATE INDEX idx_lease_contracts_berth ON lease_contracts(berth_id);
CREATE INDEX idx_lease_contracts_status ON lease_contracts(status);
CREATE INDEX idx_lease_contracts_dates ON lease_contracts(start_date, end_date);
CREATE INDEX idx_payments_contract ON payments(contract_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_violations_berth ON violations(berth_id);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontoons ENABLE ROW LEVEL SECURITY;
ALTER TABLE berths ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Admin can manage all profiles" ON profiles
  FOR ALL USING (get_user_role() = 'admin');

-- PONTOONS policies (everyone can read, only admin can write)
CREATE POLICY "Everyone can view pontoons" ON pontoons
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage pontoons" ON pontoons
  FOR ALL USING (get_user_role() = 'admin');

-- BERTHS policies
CREATE POLICY "Everyone can view berths" ON berths
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage berths" ON berths
  FOR ALL USING (get_user_role() = 'admin');

-- VESSELS policies
CREATE POLICY "Operators+ can view vessels" ON vessels
  FOR SELECT USING (get_user_role() IN ('operator', 'manager', 'admin'));

CREATE POLICY "Inspectors can view vessels they recorded" ON vessels
  FOR SELECT USING (
    get_user_role() = 'inspector' AND
    id IN (SELECT vessel_id FROM daily_occupancy WHERE recorded_by = auth.uid())
  );

CREATE POLICY "Managers+ can manage vessels" ON vessels
  FOR ALL USING (get_user_role() IN ('manager', 'admin'));

CREATE POLICY "Inspectors can create vessels" ON vessels
  FOR INSERT WITH CHECK (get_user_role() IN ('inspector', 'operator', 'manager', 'admin'));

-- DAILY_OCCUPANCY policies
CREATE POLICY "Everyone can view occupancy" ON daily_occupancy
  FOR SELECT USING (true);

CREATE POLICY "Everyone can record occupancy" ON daily_occupancy
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Operators+ can update occupancy" ON daily_occupancy
  FOR UPDATE USING (get_user_role() IN ('operator', 'manager', 'admin'));

CREATE POLICY "Inspectors can update own occupancy" ON daily_occupancy
  FOR UPDATE USING (
    get_user_role() = 'inspector' AND
    recorded_by = auth.uid() AND
    date = CURRENT_DATE
  );

-- LEASE_CONTRACTS policies (managers+ only)
CREATE POLICY "Managers+ can view contracts" ON lease_contracts
  FOR SELECT USING (get_user_role() IN ('manager', 'admin'));

CREATE POLICY "Managers+ can manage contracts" ON lease_contracts
  FOR ALL USING (get_user_role() IN ('manager', 'admin'));

-- PAYMENTS policies
CREATE POLICY "Operators+ can view payments" ON payments
  FOR SELECT USING (get_user_role() IN ('operator', 'manager', 'admin'));

CREATE POLICY "Managers+ can manage payments" ON payments
  FOR ALL USING (get_user_role() IN ('manager', 'admin'));

-- VIOLATIONS policies
CREATE POLICY "Operators+ can view violations" ON violations
  FOR SELECT USING (get_user_role() IN ('operator', 'manager', 'admin'));

CREATE POLICY "Operators+ can create violations" ON violations
  FOR INSERT WITH CHECK (get_user_role() IN ('operator', 'manager', 'admin'));

CREATE POLICY "Managers+ can manage violations" ON violations
  FOR UPDATE USING (get_user_role() IN ('manager', 'admin'));

-- AUDIT_LOGS policies (admin only)
CREATE POLICY "Admin can view audit logs" ON audit_logs
  FOR SELECT USING (get_user_role() = 'admin');

-- =====================
-- UPDATED_AT TRIGGERS
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER vessels_updated_at
  BEFORE UPDATE ON vessels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER lease_contracts_updated_at
  BEFORE UPDATE ON lease_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- AUDIT LOG TRIGGERS
-- =====================
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
CREATE TRIGGER audit_lease_contracts
  AFTER INSERT OR UPDATE OR DELETE ON lease_contracts
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_violations
  AFTER INSERT OR UPDATE OR DELETE ON violations
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
