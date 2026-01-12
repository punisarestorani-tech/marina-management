'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Anchor, MapPin, Settings as SettingsIcon, Loader2, RefreshCw } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface Pontoon {
  id: string;
  code: string;
  name: string;
  berthCount: number;
  isActive: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [pontoons, setPontoons] = useState<Pontoon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch pontoons from Supabase
  const fetchPontoons = async () => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();

      // Fetch pontoons
      const { data: pontoonsData, error: pontoonsError } = await supabase
        .from('pontoons')
        .select('id, code, name, is_active')
        .order('code', { ascending: true });

      if (pontoonsError) {
        console.error('Error loading pontoons:', pontoonsError);
        return;
      }

      // Fetch berth counts for each pontoon
      const pontoonsWithCounts: Pontoon[] = [];

      for (const pontoon of pontoonsData || []) {
        const { count } = await supabase
          .from('berths')
          .select('id', { count: 'exact', head: true })
          .eq('pontoon_id', pontoon.id);

        pontoonsWithCounts.push({
          id: pontoon.id,
          code: pontoon.code,
          name: pontoon.name,
          berthCount: count || 0,
          isActive: pontoon.is_active === true,
        });
      }

      setPontoons(pontoonsWithCounts);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPontoons();
  }, []);

  // Calculate total berths
  const totalBerths = pontoons.reduce((sum, p) => sum + p.berthCount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Postavke</h1>
        <p className="text-muted-foreground">
          Konfiguracija sistema i marine
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">Opće postavke</TabsTrigger>
          <TabsTrigger value="marina">Struktura marine</TabsTrigger>
          <TabsTrigger value="pricing">Cjenovnik</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Opće postavke
              </CardTitle>
              <CardDescription>
                Osnovne informacije o marini
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="marinaName">Naziv marine</Label>
                  <Input id="marinaName" defaultValue="Marina Budva" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marinaCode">Šifra</Label>
                  <Input id="marinaCode" defaultValue="MRN-BDV" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresa</Label>
                <Textarea
                  id="address"
                  defaultValue="Obala bb, 85310 Budva, Crna Gora"
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" defaultValue="+382 33 123 456" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="info@marina-budva.me" />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lat">Geografska širina</Label>
                  <Input id="lat" defaultValue="42.2864" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Geografska dužina</Label>
                  <Input id="lng" defaultValue="18.8400" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  Sačuvaj izmjene
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marina" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Pontoni
                  </CardTitle>
                  <CardDescription>
                    Upravljanje pontonima i vezovima ({pontoons.length} pontona, {totalBerths} vezova ukupno)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchPontoons} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Osvježi
                  </Button>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novi ponton
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pontoons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nema pontona u bazi</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Naziv</TableHead>
                      <TableHead>Broj vezova</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Akcije</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pontoons.map((pontoon) => (
                      <TableRow key={pontoon.id}>
                        <TableCell className="font-medium">{pontoon.code}</TableCell>
                        <TableCell>{pontoon.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Anchor className="h-4 w-4 text-muted-foreground" />
                            {pontoon.berthCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pontoon.isActive ? (
                            <Badge className="bg-green-500">Aktivan</Badge>
                          ) : (
                            <Badge variant="secondary">Neaktivan</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Uredi
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mapa marine</CardTitle>
              <CardDescription>
                Upload orthophoto slike za pozadinu mape
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Povuci i ispusti sliku ili klikni za upload
                </p>
                <Button variant="outline">Izaberi sliku</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cjenovnik dnevnog veza</CardTitle>
              <CardDescription>
                Cijene po kategorijama vezova
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Mali vez (do 10m)</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue="50" />
                      <span className="text-muted-foreground">EUR/dan</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Srednji vez (10-15m)</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue="70" />
                      <span className="text-muted-foreground">EUR/dan</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Veliki vez (15m+)</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue="100" />
                      <span className="text-muted-foreground">EUR/dan</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Sezonski popust (%)</Label>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Proljeće</span>
                      <Input type="number" defaultValue="10" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Ljeto</span>
                      <Input type="number" defaultValue="0" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Jesen</span>
                      <Input type="number" defaultValue="15" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">Zima</span>
                      <Input type="number" defaultValue="25" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Sačuvaj cjenovnik
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
