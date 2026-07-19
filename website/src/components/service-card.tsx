import Link from "next/link";
import type { Service } from "@/types";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui/card";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Card className="flex flex-col p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Icon name={service.icon} className="h-6 w-6" />
        </span>
        <h3 className="text-lg font-bold text-stone-900">{service.title}</h3>
      </div>
      <p className="mt-3 flex-1 text-stone-600">{service.summary}</p>
      <Link
        href={`/services#${service.slug}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:underline"
      >
        Learn more →
      </Link>
    </Card>
  );
}
