import { ShoeCanvas } from "@/components/configurator/ShoeCanvas";
import { ConfiguratorPanel } from "@/components/configurator/ConfiguratorPanel";

export default function Home() {
  return (
    <div className="flex h-dvh w-full bg-neutral-950 text-neutral-100">
      <div className="relative min-w-0 flex-1">
        <ShoeCanvas />
      </div>
      <ConfiguratorPanel />
    </div>
  );
}
