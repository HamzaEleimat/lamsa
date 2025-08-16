'use client';

interface Booking {
  id: number;
  customerName: string;
  service: string;
  time: string;
  status: 'confirmed' | 'pending' | 'completed';
  initials: string;
}

interface BookingsListProps {
  title?: string;
  onViewAll?: () => void;
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const statusConfig = {
    confirmed: {
      className: 'bg-success/10 text-success border border-success/20',
      label: 'Confirmed'
    },
    pending: {
      className: 'bg-warning/10 text-warning border border-warning/20',
      label: 'Pending'
    },
    completed: {
      className: 'bg-info/10 text-info border border-info/20',
      label: 'Completed'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors">
      <div className="flex items-center gap-3">
        {/* Customer Avatar */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))'
          }}
        >
          {booking.initials}
        </div>
        
        {/* Customer Info */}
        <div>
          <div className="font-medium text-text-primary">
            {booking.customerName}
          </div>
          <div className="text-sm text-text-secondary">
            {booking.service}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Time */}
        <div className="text-sm text-text-secondary font-medium">
          {booking.time}
        </div>
        
        {/* Status Badge */}
        <StatusBadge status={booking.status} />
      </div>
    </div>
  );
}

export function BookingsList({ 
  title = "Recent Bookings", 
  onViewAll 
}: BookingsListProps) {
  const bookings: Booking[] = [
    {
      id: 1,
      customerName: "Sarah Johnson",
      service: "Hair Cut & Style",
      time: "10:00 AM",
      status: "confirmed",
      initials: "SJ"
    },
    {
      id: 2,
      customerName: "Amira Hassan",
      service: "Hair Cut",
      time: "11:30 AM",
      status: "pending",
      initials: "AH"
    },
    {
      id: 3,
      customerName: "Layla Al-Zahra",
      service: "Manicure",
      time: "2:00 PM",
      status: "completed",
      initials: "LZ"
    },
    {
      id: 4,
      customerName: "Maria Khalil",
      service: "Facial Treatment",
      time: "3:30 PM",
      status: "confirmed",
      initials: "MK"
    },
    {
      id: 5,
      customerName: "Youra Said",
      service: "Haircut",
      time: "4:00 PM",
      status: "pending",
      initials: "YS"
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          {title}
        </h3>
        <button 
          onClick={onViewAll}
          className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
        >
          View All
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-1">
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </div>
    </div>
  );
}