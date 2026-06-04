import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "./Button";
import { EmptyStateIllustration } from "../icons/EmptyStateIllustration";

export function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto pt-12 lg:pt-24">
      <EmptyStateIllustration />
      <h2 className="mt-8 text-2xl font-bold">{title}</h2>
      <p className="mt-3 text-sm text-secondary leading-6">{description}</p>
      <Link href={ctaHref} className="mt-8">
        <Button variant="dark">
          <Plus className="h-4 w-4" />
          {ctaLabel}
        </Button>
      </Link>
    </div>
  );
}
