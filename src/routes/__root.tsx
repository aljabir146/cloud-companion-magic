import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { MinecraftBackground } from "@/components/MinecraftBackground";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <MinecraftBackground />
      <div className="glass max-w-md rounded-xl p-8 text-center animate-fade-up">
        <div className="text-6xl mb-2"><span className="emoji-anim">🧊</span></div>
        <h1 className="pixel-font text-5xl font-bold text-gradient">404</h1>
        <p className="mt-2 text-muted-foreground">You wandered too far from spawn.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Return to base</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <MinecraftBackground />
      <div className="glass max-w-md rounded-xl p-8 text-center">
        <div className="text-5xl mb-2"><span className="emoji-anim">💥</span></div>
        <h1 className="pixel-font text-2xl font-bold">Creeper boom</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message || "Something went wrong."}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TigerHost — VPS Panel" },
      { name: "description", content: "High-performance LXC and VM management with multi-node clustering, real-time monitoring, and port forwarding." },
      { property: "og:title", content: "TigerHost — VPS Panel" },
      { property: "og:description", content: "Deploy and manage LXC containers and full VMs across a multi-node cluster." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body className="min-h-screen">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors theme="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
