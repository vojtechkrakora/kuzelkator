import Image from "next/image";

export function BrandLogo() {
  return (
    <span className="brand-lockup">
      <Image
        className="brand-icon"
        src="/icon.svg"
        alt=""
        width={40}
        height={40}
        unoptimized
      />
      <span className="brand-wordmark">
        moje<span>kuzelky</span>
        <span className="brand-domain">.cz</span>
      </span>
    </span>
  );
}
