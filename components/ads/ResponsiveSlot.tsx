import Image from "next/image";
import Link from "next/link";

interface AdSlotProps {
  image: string;
  title?: string;
  description?: string;
  href?: string;
  badge?: string;
}

export default function ResponsiveAdSlot({
  image,
  title = "Premium Advertisement",
  description = "Reach thousands of customers with high-converting campaigns.",
  href = "#",
  badge = "Sponsored",
}: AdSlotProps) {
  return (
    <Link
      href={href}
      className="group relative block w-full overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-cyan-500/20"
    >
      {/* Image */}
      <div className="relative w-full h-[220px] sm:h-[280px] md:h-[340px] lg:h-[420px] overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          priority
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Badge */}
        <div className="absolute top-4 left-4 z-10 rounded-full bg-cyan-500/90 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-md shadow-lg">
          {badge}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-5 md:p-7 text-white">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight drop-shadow-lg">
            {title}
          </h2>

          <p className="mt-2 max-w-2xl text-sm sm:text-base text-neutral-200 leading-relaxed">
            {description}
          </p>

          {/* CTA */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold backdrop-blur-md transition-all duration-300 group-hover:bg-cyan-500 group-hover:text-white">
            Learn More
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
