import { ShoeCanvas } from "@/components/configurator/ShoeCanvas";

export default function Home() {
  return (
    <div className="relative h-dvh w-full bg-neutral-950 text-neutral-100">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 py-4">
        <h1 className="text-lg font-semibold">Configurador de zapatos 3D</h1>
        <p className="text-sm text-neutral-400">
          En construcción — visor base con modelo placeholder. La
          personalización por parte llega en las próximas fases.
        </p>
      </header>
      <ShoeCanvas />
    </div>
  );
}
