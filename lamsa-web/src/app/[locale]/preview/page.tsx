import { setRequestLocale } from 'next-intl/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function PreviewPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 to-primary/10 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Lamsa Mobile App Screens Preview
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Recent implementations of customer journey screens
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Customer Onboarding Screen */}
          <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-primary/10 p-4">
              <h3 className="text-lg font-semibold">Customer Onboarding</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-[9/16] bg-muted rounded-lg p-4 flex flex-col">
                <div className="text-center mb-4">
                  <div className="w-20 h-20 bg-primary/20 rounded-full mx-auto mb-4"></div>
                  <h4 className="font-semibold text-lg mb-2">Let's get to know you</h4>
                </div>
                <div className="space-y-3 flex-1">
                  <div className="bg-background rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Full Name</div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                  <div className="bg-background rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Email (Optional)</div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-1">
                    <div className="w-8 h-1 bg-primary rounded-full"></div>
                    <div className="w-8 h-1 bg-muted rounded-full"></div>
                    <div className="w-8 h-1 bg-muted rounded-full"></div>
                  </div>
                  <div className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm">
                    Next
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>3-step onboarding flow</li>
                  <li>Profile photo upload</li>
                  <li>Language preference selection</li>
                  <li>Location services opt-in</li>
                  <li>Full RTL/Arabic support</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Service Details Screen */}
          <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-primary/10 p-4">
              <h3 className="text-lg font-semibold">Service Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-[9/16] bg-muted rounded-lg flex flex-col overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 relative">
                  <div className="absolute top-4 left-4 w-10 h-10 bg-card rounded-full flex items-center justify-center">
                    ←
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                    <div className="w-2 h-2 bg-white/50 rounded-full"></div>
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <div>
                    <h4 className="font-semibold text-lg">Hair Styling Service</h4>
                    <p className="text-primary font-bold text-xl">35 JOD</p>
                    <div className="inline-flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm mt-2">
                      🕐 1h 30m
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/20 rounded-full"></div>
                    <div className="flex-1">
                      <p className="font-medium">Beauty Salon Name</p>
                      <p className="text-sm text-muted-foreground">⭐ 4.8 (120 reviews)</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Description</p>
                    <p className="text-sm text-muted-foreground">Professional hair styling service...</p>
                  </div>
                </div>
                <div className="p-4 border-t">
                  <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-center font-medium">
                    Book Now
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Image gallery with indicators</li>
                  <li>Service pricing & duration</li>
                  <li>Provider information card</li>
                  <li>What's included section</li>
                  <li>Location details</li>
                  <li>Fixed booking button</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Booking Flow Screen */}
          <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-primary/10 p-4">
              <h3 className="text-lg font-semibold">Booking Flow</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-[9/16] bg-muted rounded-lg flex flex-col overflow-hidden">
                <div className="bg-card p-4 border-b flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center">←</div>
                  <h4 className="flex-1 text-center font-semibold">Book Service</h4>
                  <div className="w-8"></div>
                </div>
                <div className="p-4">
                  <div className="flex justify-center items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm text-primary-foreground">1</div>
                    <div className="w-12 h-0.5 bg-primary"></div>
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm">2</div>
                    <div className="w-12 h-0.5 bg-muted"></div>
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm">3</div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground mb-4">Service Details</p>
                </div>
                <div className="flex-1 p-4 space-y-3">
                  <h5 className="font-semibold text-lg mb-3">Service Details</h5>
                  <div className="bg-muted/20 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Service:</span>
                      <span className="text-sm font-medium">Hair Styling</span>
                    </div>
                    <div className="h-px bg-border"></div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Provider:</span>
                      <span className="text-sm font-medium">Elite Beauty</span>
                    </div>
                    <div className="h-px bg-border"></div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Duration:</span>
                      <span className="text-sm">90 minutes</span>
                    </div>
                    <div className="h-px bg-border"></div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <span className="text-sm font-bold text-primary">45 JOD</span>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">Included in Service</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-primary">✓</span>
                      <span>Professional service</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-primary">✓</span>
                      <span>Quality products</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t">
                  <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-center font-medium">
                    Next
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>3-step booking wizard</li>
                  <li>Service details review</li>
                  <li>Special requests form</li>
                  <li>Booking summary</li>
                  <li>Price breakdown</li>
                  <li>Progress indicator</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Date & Time Selection Screen */}
          <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-primary/10 p-4">
              <h3 className="text-lg font-semibold">Date & Time Selection</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-[9/16] bg-muted rounded-lg flex flex-col overflow-hidden">
                <div className="bg-card p-4 border-b flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center">←</div>
                  <h4 className="flex-1 text-center font-semibold">Select Date & Time</h4>
                  <div className="w-8"></div>
                </div>
                
                <div className="p-4 bg-muted/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">Hair Styling Service</p>
                      <p className="text-xs text-muted-foreground">Elite Beauty Salon</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs">90 min</p>
                      <p className="font-bold text-primary text-sm">45 JOD</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <h5 className="font-medium text-sm mb-3">Select Date</h5>
                  <div className="bg-muted/10 rounded-lg p-3">
                    <div className="text-center text-sm font-medium mb-2">December 2024</div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-muted-foreground">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 mt-2">
                      {Array.from({ length: 21 }, (_, i) => (
                        <div
                          key={i}
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-xs relative
                            ${i === 14 ? 'bg-primary text-primary-foreground' : ''}
                            ${[5,8,12,16,19].includes(i) ? 'font-medium' : 'text-muted-foreground'}
                          `}
                        >
                          {i + 1}
                          {[5,8,12,16,19].includes(i) && i !== 14 && (
                            <div className="absolute bottom-0 w-1 h-1 bg-primary rounded-full"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 flex-1">
                  <h5 className="font-medium text-sm mb-3">Select Time</h5>
                  <div className="grid grid-cols-4 gap-2">
                    {['9:00', '9:30', '10:00', '10:30'].map((time, i) => (
                      <div
                        key={time}
                        className={`px-2 py-1.5 rounded text-center text-xs
                          ${i === 2 ? 'bg-primary text-primary-foreground' : 
                            i === 1 ? 'bg-muted text-muted-foreground line-through' : 
                            'border border-border'}
                        `}
                      >
                        {time}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 border-t">
                  <div className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-center text-sm font-medium">
                    Confirm Date & Time
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Calendar with availability dots</li>
                  <li>Time slot grid</li>
                  <li>Service summary</li>
                  <li>Available/booked indicators</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Booking Confirmation Screen */}
          <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-primary/10 p-4">
              <h3 className="text-lg font-semibold">Booking Confirmation</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-[9/16] bg-muted rounded-lg flex flex-col overflow-hidden">
                <div className="bg-card p-4 border-b flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center">←</div>
                  <h4 className="flex-1 text-center font-semibold">Confirm Booking</h4>
                  <div className="w-8"></div>
                </div>
                
                <div className="flex-1 p-4 space-y-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm space-y-3">
                    <h5 className="font-medium text-sm">Booking Details</h5>
                    
                    <div className="space-y-2">
                      <div className="flex gap-2 text-sm">
                        <span>💆</span>
                        <div>
                          <p className="font-medium">Hair Styling</p>
                          <p className="text-xs text-muted-foreground">Elite Beauty</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 text-sm">
                        <span>📅</span>
                        <div>
                          <p className="font-medium">Wed, Dec 15</p>
                          <p className="text-xs text-muted-foreground">10:00 AM</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 text-sm">
                        <span>⏱️</span>
                        <p>90 minutes</p>
                      </div>
                    </div>
                    
                    <div className="h-px bg-border"></div>
                    
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Total</p>
                      <p className="font-bold text-primary">45 JOD</p>
                    </div>
                  </div>
                  
                  <div className="bg-primary/10 rounded-lg p-3 flex gap-2">
                    <span className="text-primary text-sm">ℹ️</span>
                    <p className="text-xs">Payment after confirmation</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary rounded bg-primary"></div>
                    <p className="text-xs">I agree to Terms</p>
                  </div>
                </div>
                
                <div className="p-4 border-t">
                  <div className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-center text-sm font-medium">
                    Confirm & Proceed
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Booking summary card</li>
                  <li>Terms acceptance</li>
                  <li>Success modal</li>
                  <li>Payment/booking options</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Booking Details Screen */}
          <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-primary/10 p-4">
              <h3 className="text-lg font-semibold">Booking Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-[9/16] bg-muted rounded-lg flex flex-col overflow-hidden">
                <div className="bg-card p-4 border-b flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center">←</div>
                  <h4 className="flex-1 text-center font-semibold">Booking Details</h4>
                  <div className="w-8 h-8 flex items-center justify-center">⋮</div>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white">✓</div>
                    <div>
                      <p className="font-semibold text-primary">Confirmed</p>
                      <p className="text-xs text-muted-foreground">Booking ID: ABC12345</p>
                    </div>
                  </div>
                  
                  <div className="bg-muted/20 rounded-lg p-4 space-y-3">
                    <div className="flex gap-2 items-start">
                      <span className="text-muted-foreground">💆</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Hair Styling Service</p>
                        <p className="text-xs text-muted-foreground">Elite Beauty Salon</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-muted-foreground">📅</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Wed, Dec 15, 2024</p>
                        <p className="text-xs text-muted-foreground">10:00 AM</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-muted-foreground">⏱️</span>
                      <p className="text-sm">90 minutes</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 border rounded-lg p-2 text-center text-sm">📞 Call</div>
                    <div className="flex-1 border rounded-lg p-2 text-center text-sm">📍 Directions</div>
                  </div>
                </div>
                
                <div className="flex-1"></div>
                
                <div className="p-4 space-y-2">
                  <div className="bg-primary/10 text-primary px-4 py-2.5 rounded-full text-center text-sm font-medium">
                    Reschedule
                  </div>
                  <div className="border border-error text-error px-4 py-2.5 rounded-full text-center text-sm font-medium">
                    Cancel Booking
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Booking status display</li>
                  <li>Service & provider info</li>
                  <li>Contact actions</li>
                  <li>Calendar integration</li>
                  <li>Cancel/Reschedule options</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Checkout Screen */}
          <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-primary/10 p-4">
              <h3 className="text-lg font-semibold">Checkout</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-[9/16] bg-muted rounded-lg flex flex-col overflow-hidden">
                <div className="bg-card p-4 border-b flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center">←</div>
                  <h4 className="flex-1 text-center font-semibold">Checkout</h4>
                  <div className="w-8"></div>
                </div>
                
                <div className="flex-1 p-4 space-y-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm space-y-2">
                    <h5 className="font-medium text-sm mb-2">Order Summary</h5>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>45.00 JOD</span>
                    </div>
                    <div className="flex justify-between text-sm text-primary">
                      <span>Discount</span>
                      <span>-4.50 JOD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (16%)</span>
                      <span>6.48 JOD</span>
                    </div>
                    <div className="h-px bg-border my-2"></div>
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span className="text-primary">46.98 JOD</span>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h5 className="font-medium text-sm mb-2">Promo Code</h5>
                    <div className="bg-primary/10 rounded-full px-3 py-1 inline-flex items-center gap-2 text-sm">
                      <span>🎫</span>
                      <span>FIRST10 - 10% off</span>
                      <span>×</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Payment Method</p>
                    <div className="border-2 border-primary rounded-lg p-3 flex items-center gap-2">
                      <span>⭕</span>
                      <span className="text-sm">💵 Cash Payment</span>
                    </div>
                    <div className="border rounded-lg p-3 flex items-center gap-2 opacity-60">
                      <span>○</span>
                      <span className="text-sm">💳 Visa •••• 4242</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t">
                  <div className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-center text-sm font-medium">
                    Confirm Booking
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-1">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Order summary with tax</li>
                  <li>Promo code application</li>
                  <li>Payment method selection</li>
                  <li>Cash & card options</li>
                  <li>Dynamic total calculation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-card rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Implementation Status</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 text-primary">✅ Completed</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  CustomerOnboardingScreen - 3-step profile setup
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  ServiceDetailsScreen - Service information display
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  BookingFlowScreen - Multi-step booking wizard
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  DateTimeSelectionScreen - Calendar & time selection
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  BookingConfirmationScreen - Booking summary & confirmation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  BookingDetailsScreen - View booking details
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  CheckoutScreen - Payment processing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">•</span>
                  PaymentConfirmationScreen - Payment success/failure
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-muted-foreground">🚧 Remaining</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  PaymentMethodsScreen - Manage payment methods
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  EditProfileScreen - Edit user profile
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  SettingsScreen - App settings
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  NotificationSettingsScreen - Notification preferences
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  EditProfileScreen - User profile editing
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  PaymentMethodsScreen - Credit card management
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="text-primary hover:text-primary/80">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}