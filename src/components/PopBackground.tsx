export function PopBackground() {
  return (
    <div className="pop-background">
      {/* Floating Circles */}
      <div className="pop-shape pop-circle animate-geometric" style={{
        width: '150px',
        height: '150px',
        top: '10%',
        left: '5%',
        animationDelay: '0s'
      }} />
      <div className="pop-shape pop-circle animate-geometric" style={{
        width: '100px',
        height: '100px',
        top: '60%',
        right: '10%',
        animationDelay: '3s'
      }} />
      <div className="pop-shape pop-circle animate-geometric" style={{
        width: '80px',
        height: '80px',
        bottom: '15%',
        left: '15%',
        animationDelay: '6s'
      }} />
      
      {/* Floating Squares */}
      <div className="pop-shape pop-square animate-geometric" style={{
        width: '120px',
        height: '120px',
        top: '30%',
        right: '5%',
        animationDelay: '2s'
      }} />
      <div className="pop-shape pop-square animate-geometric" style={{
        width: '90px',
        height: '90px',
        bottom: '25%',
        right: '25%',
        animationDelay: '5s'
      }} />
      
      {/* Floating Stars */}
      <div className="pop-shape pop-star animate-music-note" style={{
        width: '100px',
        height: '100px',
        top: '20%',
        left: '25%',
        animationDelay: '1s'
      }} />
      <div className="pop-shape pop-star animate-music-note" style={{
        width: '70px',
        height: '70px',
        top: '70%',
        left: '40%',
        animationDelay: '4s'
      }} />
      <div className="pop-shape pop-star animate-music-note" style={{
        width: '60px',
        height: '60px',
        top: '45%',
        right: '30%',
        animationDelay: '7s'
      }} />
      
      {/* Musical Note Shapes (using circles as simplified notes) */}
      <div className="pop-shape animate-music-note" style={{
        width: '40px',
        height: '40px',
        borderRadius: '50% 50% 50% 0',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.7), rgba(168, 85, 247, 0.7))',
        top: '15%',
        right: '15%',
        animationDelay: '2.5s'
      }} />
      <div className="pop-shape animate-music-note" style={{
        width: '35px',
        height: '35px',
        borderRadius: '50% 50% 50% 0',
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.7), rgba(234, 179, 8, 0.7))',
        bottom: '30%',
        left: '8%',
        animationDelay: '5.5s'
      }} />
      
      {/* Grid Pattern Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(236, 72, 153, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(168, 85, 247, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
        opacity: 0.3
      }} />
    </div>
  );
}
