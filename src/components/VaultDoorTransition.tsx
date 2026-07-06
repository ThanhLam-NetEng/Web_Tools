import { useEffect } from 'react';
import './VaultDoorTransition.css';

interface Props {
  onComplete: () => void;
}

// Hiệu ứng "cửa két sắt mở ra" sau khi đăng nhập thành công — 2 panel tách ra
// 2 bên kèm ánh sáng vàng loé giữa. Tôn trọng prefers-reduced-motion (CSS lo phần
// animation-duration; ở đây chỉ rút ngắn thời gian chờ trước khi điều hướng).
export function VaultDoorTransition({ onComplete }: Props) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(onComplete, prefersReducedMotion ? 50 : 750);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="vault-transition" role="presentation">
      <div className="vault-panel vault-panel-left" />
      <div className="vault-panel vault-panel-right" />
      <div className="vault-flash" />
    </div>
  );
}
