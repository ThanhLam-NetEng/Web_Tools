import './AmbientBackground.css';

// Nền động phía sau toàn app — 3 khối gradient mờ trôi chậm, tạo chiều sâu
// "két sắt bọc nhung" thay vì nền phẳng 1 màu. Tôn trọng prefers-reduced-motion.
export function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="ambient-orb ambient-orb-gold" />
      <div className="ambient-orb ambient-orb-emerald" />
      <div className="ambient-orb ambient-orb-burgundy" />
    </div>
  );
}
