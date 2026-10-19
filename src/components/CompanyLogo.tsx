import Image from "next/image";

/**
 * Full-colour company logo shown beside a project title. Square logos with a
 * solid background (e.g. app icons) get softly rounded corners.
 */
export default function CompanyLogo({
  src,
  alt,
  className = "h-6 w-6",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <span title={alt} className={`relative inline-block shrink-0 overflow-hidden rounded-md ${className}`}>
      <Image src={src} alt={`${alt} logo`} fill sizes="32px" className="object-contain" />
    </span>
  );
}
