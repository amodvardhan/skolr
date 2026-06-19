# SKILL: Frontend Development — Skolr Platform

> Reference this file for all React/TypeScript frontend work on Skolr.

---

## Stack
- **React 18** + **TypeScript 5** (strict mode)
- **Vite 5** build tool
- **Tailwind CSS 3.4** + **shadcn/ui** + **Radix UI**
- **TanStack Query v5** for server state
- **Zustand 4** for client UI state
- **React Hook Form + Zod** for forms
- **React Router v6** for routing
- **Recharts** for data visualization
- **TipTap 2** for rich text editing
- **dnd-kit** for drag and drop (CMS builder)
- **Axios** for HTTP
- **date-fns** for date manipulation

---

## Folder Structure (frontend/src/)

```
src/
├── app/
│   ├── App.tsx
│   ├── Router.tsx
│   └── Providers.tsx
├── localization/ 
│   ├── i18n.ts
│   ├── locales/ 
│   │   ├── en.json
│   │   ├── hi.json
│   │   ├── mr.json
│   │   └── gu.json
│   └── hooks/useLocalization.ts
├── modules/
│   ├── auth/
│   │   ├── pages/LoginPage.tsx
│   │   ├── hooks/useAuth.ts
│   │   └── api/authApi.ts
│   ├── students/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   └── [domain]/        ← same pattern for every module
├── components/
│   ├── ui/              ← shadcn/ui components
│   ├── layout/          ← Sidebar, Header, PageWrapper
│   ├── data-table/      ← Generic sortable table
│   ├── forms/           ← Reusable form fields
│   └── feedback/        ← EmptyState, LoadingSkeleton, ErrorBoundary
├── hooks/
│   ├── useDebounce.ts
│   ├── usePagination.ts
│   └── usePermissions.ts
├── stores/
│   ├── authStore.ts
│   ├── uiStore.ts       ← sidebar open/close, theme
│   └── tenantStore.ts
├── lib/
│   ├── api.ts           ← Axios instance
│   ├── queryClient.ts
│   └── utils.ts
└── types/
    └── global.d.ts
```

---

## API Client (lib/api.ts)
```typescript
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const { token, schoolId } = useAuthStore.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (schoolId) config.headers['X-School-ID'] = schoolId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      await useAuthStore.getState().refreshToken();
    }
    return Promise.reject(error);
  }
);
```

---

## TanStack Query Patterns

```typescript
// hooks/useStudents.ts
export const useStudents = (filters: StudentFilters) => {
  return useQuery({
    queryKey: ['students', filters],
    queryFn: () => studentApi.list(filters).then(r => r.data),
    staleTime: 30_000,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: studentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student added successfully');
    },
  });
};
```

---

## Zustand Store Pattern

```typescript
// stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

---

## Form Pattern (React Hook Form + Zod)

```typescript
const studentSchema = z.object({
  firstName: z.string().min(2, 'Too short'),
  lastName: z.string().min(2, 'Too short'),
  classId: z.string().uuid('Select a class'),
  dateOfBirth: z.string(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export function StudentForm({ onSubmit }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('firstName')} error={errors.firstName?.message} />
      <Button type="submit">Save Student</Button>
    </form>
  );
}
```

---

## Data Table Pattern

```typescript
// Every list page uses the generic DataTable component
<DataTable
  columns={studentColumns}
  data={students}
  loading={isLoading}
  pagination={pagination}
  onPageChange={setPage}
  rowActions={(row) => [
    { label: 'Edit', onClick: () => navigate(`/students/${row.id}/edit`) },
    { label: 'View Profile', onClick: () => navigate(`/students/${row.id}`) },
  ]}
  bulkActions={[
    { label: 'Export', onClick: handleExport },
  ]}
  emptyState={<EmptyState title="No students yet" description="Add your first student" cta="Add Student" />}
/>
```

---

## Design Tokens (Tailwind + CSS Vars)

```css
/* Always use these, never hardcode colors */
--color-primary: #1E40AF;
--color-accent: #F59E0B;

/* Component defaults */
.card { @apply bg-white rounded-xl shadow-sm border border-neutral-100 p-6; }
.page-header { @apply flex items-center justify-between mb-6; }
.section-title { @apply text-lg font-semibold text-neutral-900; }
```

**Typography classes:**
```
text-2xl font-bold     → Page titles
text-lg font-semibold  → Section headers
text-sm font-medium    → Labels
text-sm text-neutral-500 → Secondary/helper text
```

---

## Layout Structure (Admin Panel)

```
┌─────────────────────────────────────────────────┐
│  HEADER (64px)  - Logo, School Name, User Menu  │
├──────────┬──────────────────────────────────────┤
│ SIDEBAR  │  MAIN CONTENT AREA                   │
│ 240px    │  - PageHeader (title + actions)       │
│ (collapses│  - Content (table, form, dashboard) │
│  to 64px)│  - max-w-7xl mx-auto px-6 py-6       │
└──────────┴──────────────────────────────────────┘
```

---

## Naming Conventions

- Files: PascalCase for components (`StudentList.tsx`), camelCase for hooks/utils
- Hooks: always prefix with `use` (`useStudents`, `useFeeCollection`)
- API files: `[domain]Api.ts` (`studentApi.ts`)
- Types: PascalCase interfaces, suffix with context (`StudentRow`, `StudentFormData`)
- Zod schemas: camelCase with `Schema` suffix (`studentSchema`)

---

## Common Mistakes to Avoid

- Never use `useEffect` to fetch data — use TanStack Query
- Never store server data in Zustand — Zustand is for UI state only
- Never use `any` type — use `unknown` then narrow
- Never inline onClick handlers in tables — extract to named functions
- Always handle loading + error states in every data component
- Always use `date-fns` for date formatting, never `.toLocaleDateString()`
- Use `cn()` utility from shadcn for conditional Tailwind classes
- Use `i18Next` utility for localization, no hardcoding of the labels on UI
