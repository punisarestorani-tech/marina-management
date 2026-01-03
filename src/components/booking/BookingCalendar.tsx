'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Booking,
  BookingStatus,
  BOOKING_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
} from '@/types/booking.types';

interface BookingCalendarProps {
  berthCode: string;
  bookings: Booking[];
  onDateClick?: (date: string) => void;
  onBookingClick?: (booking: Booking) => void;
  onNewBooking?: (startDate: string, endDate: string) => void;
}

// Get days in month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Get day of week for first day of month (0 = Sunday)
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// Format date as YYYY-MM-DD
function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Check if two date ranges overlap
function datesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && start2 < end1;
}

export function BookingCalendar({
  berthCode,
  bookings,
  onDateClick,
  onBookingClick,
  onNewBooking,
}: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: { date: string; dayOfMonth: number; isCurrentMonth: boolean }[] = [];

    // Previous month days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(prevYear, prevMonth, day);
      days.push({
        date: formatDateISO(date),
        dayOfMonth: day,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date: formatDateISO(date),
        dayOfMonth: day,
        isCurrentMonth: true,
      });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(nextYear, nextMonth, day);
      days.push({
        date: formatDateISO(date),
        dayOfMonth: day,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Get booking for a specific date
  const getBookingForDate = (date: string): Booking | undefined => {
    return bookings.find(
      (b) =>
        b.status !== 'cancelled' &&
        b.status !== 'no_show' &&
        b.checkInDate <= date &&
        b.checkOutDate > date
    );
  };

  // Check if date is check-in or check-out
  const getDateType = (date: string, booking: Booking): 'check-in' | 'check-out' | 'middle' => {
    if (booking.checkInDate === date) return 'check-in';
    if (booking.checkOutDate === date) return 'check-out';
    return 'middle';
  };

  // Handle date click
  const handleDateClick = (date: string) => {
    const booking = getBookingForDate(date);

    if (booking && onBookingClick) {
      onBookingClick(booking);
      return;
    }

    if (onNewBooking) {
      if (!isSelecting) {
        setSelectionStart(date);
        setSelectionEnd(date);
        setIsSelecting(true);
      } else {
        if (date >= selectionStart!) {
          setSelectionEnd(date);
          // Check if selection overlaps with existing booking
          const overlaps = bookings.some(
            (b) =>
              b.status !== 'cancelled' &&
              b.status !== 'no_show' &&
              datesOverlap(selectionStart!, date, b.checkInDate, b.checkOutDate)
          );

          if (!overlaps) {
            // Add one day to end date for check-out
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            onNewBooking(selectionStart!, formatDateISO(endDate));
          }
        }
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    }

    if (onDateClick) {
      onDateClick(date);
    }
  };

  // Check if date is in selection range
  const isInSelection = (date: string): boolean => {
    if (!selectionStart || !selectionEnd) return false;
    return date >= selectionStart && date <= selectionEnd;
  };

  // Navigate months
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const today = formatDateISO(new Date());

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Vez: {berthCode}</h3>
          <p className="text-sm text-muted-foreground">Kalendar rezervacija</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Danas
          </Button>
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">
            {monthNames[month]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(({ date, dayOfMonth, isCurrentMonth }) => {
          const booking = getBookingForDate(date);
          const isToday = date === today;
          const inSelection = isInSelection(date);
          const isPast = date < today;

          return (
            <div
              key={date}
              onClick={() => handleDateClick(date)}
              className={`
                relative min-h-[60px] p-1 rounded border cursor-pointer transition-all
                ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 opacity-50' : ''}
                ${isToday ? 'ring-2 ring-blue-500' : ''}
                ${inSelection ? 'bg-blue-100 dark:bg-blue-900/50' : ''}
                ${isPast && !booking ? 'bg-gray-100 dark:bg-gray-800' : ''}
                ${!booking && !isPast ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : ''}
                ${booking ? '' : 'border-gray-200 dark:border-gray-700'}
              `}
              style={
                booking
                  ? {
                      backgroundColor: BOOKING_STATUS_COLORS[booking.status].bg,
                      borderColor: BOOKING_STATUS_COLORS[booking.status].text,
                    }
                  : undefined
              }
            >
              <span
                className={`
                  text-xs font-medium
                  ${isToday ? 'text-blue-600 font-bold' : ''}
                  ${booking ? '' : 'text-gray-700 dark:text-gray-300'}
                `}
                style={
                  booking
                    ? { color: BOOKING_STATUS_COLORS[booking.status].text }
                    : undefined
                }
              >
                {dayOfMonth}
              </span>

              {booking && (
                <div className="mt-0.5">
                  <p
                    className="text-[10px] font-medium truncate"
                    style={{ color: BOOKING_STATUS_COLORS[booking.status].text }}
                  >
                    {booking.guestName.split(' ')[0]}
                  </p>
                  {booking.checkInDate === date && (
                    <span className="text-[8px] bg-green-500 text-white px-1 rounded">
                      IN
                    </span>
                  )}
                  {booking.checkOutDate === date && (
                    <span className="text-[8px] bg-red-500 text-white px-1 rounded">
                      OUT
                    </span>
                  )}
                </div>
              )}

              {!booking && !isPast && isCurrentMonth && (
                <div className="absolute bottom-1 right-1 opacity-0 hover:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
        {Object.entries(BOOKING_STATUS_COLORS)
          .filter(([status]) => ['pending', 'confirmed', 'checked_in'].includes(status))
          .map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: colors.bg, border: `1px solid ${colors.text}` }}
              />
              <span className="text-xs text-muted-foreground">{colors.label}</span>
            </div>
          ))}
      </div>

      {/* Selection hint */}
      {isSelecting && (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded text-sm text-blue-700 dark:text-blue-300">
          Kliknite na datum odlaska za kreiranje rezervacije
        </div>
      )}
    </Card>
  );
}

// Month names for display
const MONTH_NAMES = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
];

// Timeline view for multiple berths - Month based
interface BookingTimelineProps {
  berths: { id: string; code: string }[];
  bookings: Booking[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onBookingClick?: (booking: Booking) => void;
  onCellClick?: (berthId: string, berthCode: string, date: string) => void;
}

export function BookingTimeline({
  berths,
  bookings,
  currentMonth,
  onMonthChange,
  onBookingClick,
  onCellClick,
}: BookingTimelineProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);

  // Generate date headers for the month
  const dates = useMemo(() => {
    const result: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      result.push(formatDateISO(date));
    }
    return result;
  }, [year, month, daysInMonth]);

  const today = formatDateISO(new Date());

  // Get booking for berth on date
  const getBooking = (berthId: string, date: string): Booking | undefined => {
    return bookings.find(
      (b) =>
        b.berthId === berthId &&
        b.status !== 'cancelled' &&
        b.status !== 'no_show' &&
        b.checkInDate <= date &&
        b.checkOutDate > date
    );
  };

  // Navigate months
  const goToPrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    onMonthChange(new Date());
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Danas
          </Button>
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timeline grid */}
      <div className="overflow-x-auto border rounded-lg">
        <div className="min-w-max">
          {/* Header row with dates */}
          <div className="flex border-b sticky top-0 bg-background z-10">
            <div className="w-24 shrink-0 p-2 font-medium text-sm bg-gray-50 dark:bg-gray-800 border-r sticky left-0 z-20">
              Vez
            </div>
            {dates.map((date) => {
              const d = new Date(date);
              const isToday = date === today;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const dayNum = d.getDate();
              const isFirstOfMonth = dayNum === 1;

              return (
                <div
                  key={date}
                  className={`
                    w-11 shrink-0 p-1 text-center text-xs border-l
                    ${isToday ? 'bg-blue-100 dark:bg-blue-900 font-bold' : ''}
                    ${isWeekend && !isToday ? 'bg-gray-100 dark:bg-gray-800' : ''}
                    ${isFirstOfMonth ? 'border-l-2 border-l-blue-400' : ''}
                  `}
                >
                  <div className={`font-medium ${isToday ? 'text-blue-600' : ''}`}>
                    {dayNum}
                  </div>
                  <div className={`text-muted-foreground ${isToday ? 'text-blue-500' : ''}`}>
                    {['N', 'P', 'U', 'S', 'Č', 'P', 'S'][d.getDay()]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Berth rows */}
          {berths.map((berth) => (
            <div key={berth.id} className="flex border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
              <div className="w-24 shrink-0 p-2 font-medium text-sm bg-gray-50 dark:bg-gray-800 border-r sticky left-0 z-10">
                {berth.code}
              </div>
              {dates.map((date) => {
                const booking = getBooking(berth.id, date);
                const isToday = date === today;
                const isCheckIn = booking?.checkInDate === date;
                const d = new Date(date);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                return (
                  <div
                    key={date}
                    onClick={() => {
                      if (booking && onBookingClick) {
                        onBookingClick(booking);
                      } else if (onCellClick) {
                        onCellClick(berth.id, berth.code, date);
                      }
                    }}
                    className={`
                      w-11 shrink-0 h-11 border-l cursor-pointer transition-colors relative
                      ${isToday ? 'ring-2 ring-blue-500 ring-inset z-[5]' : ''}
                      ${!booking && isWeekend ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                      ${!booking ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30' : ''}
                    `}
                    style={
                      booking
                        ? {
                            backgroundColor: BOOKING_STATUS_COLORS[booking.status].bg,
                          }
                        : undefined
                    }
                    title={
                      booking
                        ? `${booking.guestName} - ${booking.vesselName || 'N/A'}\n${booking.checkInDate} - ${booking.checkOutDate}`
                        : `Slobodno - ${date}`
                    }
                  >
                    {isCheckIn && (
                      <div className="h-full flex items-center justify-center">
                        <span
                          className="text-[9px] font-bold px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: BOOKING_STATUS_COLORS[booking!.status].text,
                            color: 'white'
                          }}
                        >
                          IN
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2">
        {Object.entries(BOOKING_STATUS_COLORS)
          .filter(([status]) => ['pending', 'confirmed', 'checked_in'].includes(status))
          .map(([status, colors]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: colors.bg, border: `2px solid ${colors.text}` }}
              />
              <span className="text-sm text-muted-foreground">{colors.label}</span>
            </div>
          ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded ring-2 ring-blue-500" />
          <span className="text-sm text-muted-foreground">Danas</span>
        </div>
      </div>
    </div>
  );
}
