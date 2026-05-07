export const mockUser = {
  name: 'Arjun Mehta',
  phone: '+91 98765 43210',
  email: 'arjun@example.com',
  avatar: null,
  vehicles: [
    { id: 1, model: 'BMW 3 Series', number: 'MH 02 AB 1234', parking: 'Tower A, Slot 42', color: '#007AFF' },
    { id: 2, model: 'Hyundai Creta', number: 'MH 04 CD 5678', parking: 'Tower B, Slot 15', color: '#DFFF00' }
  ]
}

export const mockPackages = [
  {
    id: 1, name: 'Basic Plan', tier: 'Essential Care',
    price: 599, duration: 'Monthly', perDay: 20,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM - 10 AM Slot', 'Doorstep Service', 'Windshield Rinse'],
    popular: false
  },
  {
    id: 2, name: 'Standard Plan', tier: 'Popular Choice',
    price: 999, duration: 'Monthly', perDay: 33,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM - 10 AM Slot', 'Liquid Wax Shine (Weekly)', 'Tire Polish (Weekly)', 'Monthly Interior Add-on'],
    popular: true
  },
  {
    id: 3, name: 'Elite Plan', tier: 'Luxury Care',
    price: 1999, duration: 'Monthly', perDay: 66,
    features: ['Daily Exterior Cleaning', '365 Days (No Holidays)', '5 AM - 10 AM Slot', 'Interior Cleaning (Weekly)', 'Microfiber Deep Dry', 'Priority Support'],
    popular: false
  }
]

export const mockSubscription = {
  id: 1,
  package: mockPackages[1],
  vehicle: mockUser.vehicles[0],
  status: 'Active',
  startDate: '2025-04-01',
  endDate: '2025-04-30',
  totalDays: 30,
  completedDays: 18,
  skippedDays: 2,
  remainingDays: 10,
  nextWash: '2025-04-19'
}

export const mockServiceHistory = [
  { id: 1, date: '2025-04-18', vehicle: 'BMW 3 Series', service: 'Premium Detail', status: 'Completed', cleaner: 'Raj Kumar', time: '07:15 AM' },
  { id: 2, date: '2025-04-17', vehicle: 'BMW 3 Series', service: 'Premium Detail', status: 'Completed', cleaner: 'Raj Kumar', time: '07:22 AM' },
  { id: 3, date: '2025-04-16', vehicle: 'BMW 3 Series', service: 'Premium Detail', status: 'Skipped', cleaner: '-', time: '-' },
  { id: 4, date: '2025-04-15', vehicle: 'BMW 3 Series', service: 'Premium Detail', status: 'Completed', cleaner: 'Raj Kumar', time: '07:08 AM' },
  { id: 5, date: '2025-04-14', vehicle: 'Hyundai Creta', service: 'Daily Exterior', status: 'Completed', cleaner: 'Amit Singh', time: '06:55 AM' },
]

export const mockCleaner = {
  name: 'Raj Kumar',
  rank: 'Senior Detailer',
  rating: 4.8,
  completionRate: 96,
  totalCompleted: 1247,
  area: 'Sector 42-48, Gurugram'
}

export const mockTasks = [
  { id: 1, car: 'BMW 3 Series', plate: 'MH 02 AB 1234', location: 'Tower A, Slot 42', customer: 'Arjun Mehta', package: 'Premium Detail', status: 'pending', time: '07:00 AM' },
  { id: 2, car: 'Mercedes C-Class', plate: 'DL 01 EF 9012', location: 'Tower C, Slot 08', customer: 'Priya Sharma', package: 'Elite Care', status: 'in-progress', time: '07:30 AM' },
  { id: 3, car: 'Hyundai Creta', plate: 'MH 04 CD 5678', location: 'Tower B, Slot 15', customer: 'Arjun Mehta', package: 'Daily Exterior', status: 'completed', time: '06:30 AM' },
  { id: 4, car: 'Maruti Swift', plate: 'HR 26 GH 3456', location: 'Tower A, Slot 31', customer: 'Vikram Patel', package: 'Daily Exterior', status: 'pending', time: '08:00 AM' },
  { id: 5, car: 'Tata Nexon EV', plate: 'MH 12 IJ 7890', location: 'Tower D, Slot 55', customer: 'Neha Gupta', package: 'Premium Detail', status: 'pending', time: '08:30 AM' },
]

export const mockAdminStats = {
  totalUsers: 12847,
  userGrowth: 12.4,
  activeSubscriptions: 8234,
  subGrowth: 5.2,
  todayRevenue: 142500,
  revenueGrowth: 8.7,
  activeCleaners: 142,
  cleanerGrowth: 3.1,
}

export const mockRevenueData = [
  { month: 'Jan', revenue: 820000, subscriptions: 6200 },
  { month: 'Feb', revenue: 950000, subscriptions: 6800 },
  { month: 'Mar', revenue: 1100000, subscriptions: 7400 },
  { month: 'Apr', revenue: 1250000, subscriptions: 7900 },
  { month: 'May', revenue: 1180000, subscriptions: 7600 },
  { month: 'Jun', revenue: 1350000, subscriptions: 8100 },
  { month: 'Jul', revenue: 1420000, subscriptions: 8234 },
]

export const mockAdminUsers = [
  { id: 1, name: 'Arjun Mehta', phone: '+91 98765 43210', vehicles: 2, plan: 'Standard', status: 'Active', joined: '2025-01-15' },
  { id: 2, name: 'Priya Sharma', phone: '+91 87654 32109', vehicles: 1, plan: 'Elite', status: 'Active', joined: '2025-02-20' },
  { id: 3, name: 'Vikram Patel', phone: '+91 76543 21098', vehicles: 1, plan: 'Basic', status: 'Active', joined: '2025-03-10' },
  { id: 4, name: 'Neha Gupta', phone: '+91 65432 10987', vehicles: 3, plan: 'Standard', status: 'Paused', joined: '2025-01-22' },
  { id: 5, name: 'Rohit Verma', phone: '+91 54321 09876', vehicles: 1, plan: 'Basic', status: 'Expired', joined: '2024-11-05' },
  { id: 6, name: 'Ananya Iyer', phone: '+91 43210 98765', vehicles: 2, plan: 'Elite', status: 'Active', joined: '2025-04-01' },
]

export const mockNotifications = [
  { id: 1, type: 'service', title: 'Cleaning Completed', message: 'Your BMW 3 Series has been cleaned.', time: '2 hours ago', read: false },
  { id: 2, type: 'subscription', title: 'Renewal Reminder', message: 'Your Premium subscription expires in 10 days.', time: '5 hours ago', read: false },
  { id: 3, type: 'offer', title: '20% Off Elite Plan!', message: 'Upgrade to Elite and save ₹700 this month.', time: '1 day ago', read: true },
  { id: 4, type: 'service', title: 'Service Skipped', message: 'You skipped the cleaning on Apr 16.', time: '2 days ago', read: true },
]

export const testimonials = [
  { name: 'Rohit Agarwal', role: 'BMW Owner', text: 'Cleanzo transformed my morning routine. My car is spotless every single day without me lifting a finger.', rating: 5 },
  { name: 'Simran Kaur', role: 'Fleet Manager', text: 'Managing 30+ vehicles was a nightmare. Cleanzo\'s subscription model and admin panel made it effortless.', rating: 5 },
  { name: 'Deepak Joshi', role: 'Audi Owner', text: 'The Elite Care package is worth every rupee. Interior detailing is better than what I got at the dealership.', rating: 5 },
  { name: 'Meera Patel', role: 'Tesla Owner', text: 'I love the skip feature. When I\'m traveling, I just skip and the days get added back. Brilliant!', rating: 4 },
]
