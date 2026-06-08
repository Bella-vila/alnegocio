type P = { className?: string };
const base = "h-5 w-5";

function S({ className, children }: P & { children: React.ReactNode }) {
  return (
    <svg className={className ?? base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const DashboardIcon = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </S>
);

export const SalesIcon = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2 3h3l2.4 12.3a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.2L22 7H6" />
  </S>
);

export const ProductsIcon = (p: P) => (
  <S {...p}>
    <path d="M21 8 12 3 3 8l9 5 9-5Z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </S>
);

export const PurchaseIcon = (p: P) => (
  <S {...p}>
    <path d="M3 4h2l1 14h12l2-9H6" />
    <path d="M12 8v6M9 11h6" />
  </S>
);

export const ContactsIcon = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 4.5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-5-5.9" />
  </S>
);

export const EmployeesIcon = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="7" r="3.5" />
    <path d="M5 21a7 7 0 0 1 14 0" />
  </S>
);

export const AccountUsersIcon = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="9" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 4.5a3 3 0 0 1 0 6" />
    <path d="M17.5 14.2A5.5 5.5 0 0 1 21 20" />
    <path d="M19 6.5l1 1 2-2" />
  </S>
);

export const BalanceIcon = (p: P) => (
  <S {...p}>
    <path d="M12 3v18" />
    <path d="M7 21h10" />
    <path d="M5 7h14" />
    <path d="M5 7l-2.5 5a3 3 0 0 0 5 0L5 7Z" />
    <path d="M19 7l-2.5 5a3 3 0 0 0 5 0L19 7Z" />
  </S>
);

export const ExchangeIcon = (p: P) => (
  <S {...p}>
    <path d="M3 8h14" />
    <path d="m14 5 3 3-3 3" />
    <path d="M21 16H7" />
    <path d="m10 13-3 3 3 3" />
  </S>
);

export const SupplyIcon = (p: P) => (
  <S {...p}>
    <path d="M3 10h18" />
    <path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
    <path d="M5 10v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    <path d="M9 14h6" />
  </S>
);

export const AccountingIcon = (p: P) => (
  <S {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 7h8M8 11h8M8 15h5" />
  </S>
);

export const ReportsIcon = (p: P) => (
  <S {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </S>
);

export const SettingsIcon = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2A1.6 1.6 0 0 0 7 19.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 14H4a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 5.7 7L5.6 7a2 2 0 1 1 2.8-2.9l.1.1A1.6 1.6 0 0 0 11 4.7V4a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 19.3 11H20a2 2 0 1 1 0 4h-.2" />
  </S>
);

export const PlusIcon = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const TrashIcon = (p: P) => (
  <S {...p}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </S>
);

export const EditIcon = (p: P) => (
  <S {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </S>
);

export const SearchIcon = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </S>
);

export const WalletIcon = (p: P) => (
  <S {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0" />
    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5" />
    <path d="M16 13h.01" />
  </S>
);

export const StoreIcon = (p: P) => (
  <S {...p}>
    <path d="M4 9h16l-1-5H5L4 9Z" />
    <path d="M4 9v11h16V9" />
    <path d="M9 20v-5h6v5" />
  </S>
);

export const AlertIcon = (p: P) => (
  <S {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </S>
);
