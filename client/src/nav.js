// Single source of truth for sidebar navigation structure. Icons live in
// Sidebar.jsx (keyed by `icon`); this file is just the data so the GlobalSearch
// page list stays in sync with the sidebar automatically.

export const NAV_SECTIONS = [
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Overview', icon: 'overview', end: true },
      { to: '/cases', label: 'Revenue Cases', icon: 'cases' },
      { to: '/audit-trail', label: 'Audit Trail', icon: 'auditTrail' },
    ],
  },
  {
    label: 'Operate',
    items: [
      { to: '/live-demo', label: 'Live Demo', icon: 'liveDemo' },
      { to: '/payment-links', label: 'Payment Links', icon: 'paymentLinks' },
      { to: '/recoveries', label: 'Recoveries', icon: 'recoveries' },
      { to: '/simulations', label: 'Simulations', icon: 'simulations' },
    ],
  },
  {
    label: 'Configure',
    items: [
      { to: '/policies', label: 'Policies', icon: 'policies' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);
