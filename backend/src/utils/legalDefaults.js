// Fallback content shown when the admin hasn't saved Terms/Privacy via the CMS yet.
export const DEFAULT_TERMS = {
  lastUpdated: 'October 2023',
  sections: [
    { id: 1, title: '1. Acceptance of Terms', content: 'By accessing and using the Cleanzo application and services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services. These terms constitute a legally binding agreement between you and Cleanzo.' },
    { id: 2, title: '2. Service Description', content: 'Cleanzo provides premium mobile car detailing and daily doorstep cleaning services. Our service includes exterior cleaning, with interior vacuuming and specialized treatments available as add-ons. We reserve the right to refuse service to any vehicle that poses a health or safety risk or is in a condition that prevents safe cleaning.' },
    { id: 3, title: '3. User Obligations', content: 'You are responsible for providing accurate location data and ensuring that your vehicle is parked in a location where our executives can safely perform the service. You must also ensure that all windows and doors are fully closed prior to the scheduled service time.' },
    { id: 4, title: '4. Service Availability & External Factors', content: 'Cleanzo strives to provide 365-day service. However, services may be temporarily suspended due to external factors beyond our control, including heavy rain, curfew/lockdown restrictions, or election day regulations. In such cases, missed service days are automatically added back to subscription validity.' },
    { id: 5, title: '5. Leave Policy', content: 'Our cleaning staff is entitled to one scheduled leave per month. This day is already factored into our competitive pricing model and will not be added back to your subscription validity. Any additional leaves taken by the staff beyond this will be credited back to your account.' },
    { id: 6, title: '6. Liability & Damages', content: 'While we take the utmost care, Cleanzo is not liable for pre-existing damage, loose parts, mechanical issues, or internal electronic failures. We recommend securing or removing all valuables from the vehicle prior to service. Any claims for damage must be reported within 24 hours of service completion.' }
  ]
};

export const DEFAULT_PRIVACY = {
  lastUpdated: 'October 2023',
  sections: [
    { id: 1, title: '1. Information Collection', content: 'We collect personal information that you provide to us, including your name, email address, phone number, vehicle details (make, model, color, and license plate), and service addresses. We also collect payment information through our secure third-party payment processors.' },
    { id: 2, title: '2. Usage of Data', content: 'Your data is used primarily to facilitate the car cleaning services you request. This includes dispatching executives, processing payments, providing service updates via push notifications or SMS, and improving our internal logistics and customer support experiences.' },
    { id: 3, title: '3. Location & GPS Tracking', content: 'Cleanzo requires access to your location data to ensure our service executives can locate your vehicle accurately in parking lots or residential complexes. This data is only accessed when a service is scheduled or active and is never sold to third parties.' },
    { id: 4, title: '4. Data Sharing & Third Parties', content: 'We do not sell your personal data. We share information only with trusted partners necessary for service delivery, such as payment gateways and map service providers. We may also disclose information if required by law or to protect our rights and safety.' },
    { id: 5, title: '5. Your Rights & Choices', content: 'You have the right to access, correct, or delete your personal information through the account settings in the app. You can also opt-out of marketing communications at any time, though you will still receive essential service-related notifications.' }
  ]
};
