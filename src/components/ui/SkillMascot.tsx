import Image from "next/image";

export function SkillMascot({ skill }: { skill: string }) {
  return (
    <div className="relative h-28 overflow-hidden bg-gradient-to-br from-brand-soft to-[#FFF7E8] sm:h-32">
      <Image
        src={`/brand/skill-${skill.toLowerCase()}.webp`}
        alt=""
        fill
        sizes="(max-width: 640px) 40vw, 180px"
        className="object-contain p-2 transition-transform duration-300 ease-out group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
      />
    </div>
  );
}
