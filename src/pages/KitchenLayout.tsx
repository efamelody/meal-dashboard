import { NavLink, Outlet, Link } from "react-router-dom"
import {
  Salad,
  Plus,
  ClipboardList,
  ShoppingCart,
  Refrigerator,
} from "lucide-react"
import { PageContainer, PageHeader } from "../components/PageHeader"

const tabs = [
  { to: "/kitchen/meals", label: "Meals", icon: Salad },
  { to: "/kitchen/inventory", label: "Inventory", icon: ClipboardList },
  { to: "/kitchen/grocery", label: "Groceries", icon: ShoppingCart },
]

export default function KitchenLayout() {
  return (
    <PageContainer maxWidth="max-w-6xl">
      <PageHeader
        title="Kitchen"
        subtitle="Your recipes, what's in stock, and what's left to buy."
        actions={
          <Link
            to="/kitchen/meals?new=1"
            className="hidden sm:inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-accent transition-colors"
          >
            <Plus size={16} />
            Add meal
          </Link>
        }
      >
        <nav
          aria-label="Kitchen sections"
          className="flex items-center gap-1 border-b border-border"
        >
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative -mb-px inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} />
                  {label}
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          <span className="ml-auto hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground pr-1 pb-2.5">
            <Refrigerator size={13} />
            Everything here is yours only
          </span>
        </nav>
      </PageHeader>
      <Outlet />
    </PageContainer>
  )
}
