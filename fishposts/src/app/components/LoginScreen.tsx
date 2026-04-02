"use client";

export function LoginScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="login-screen">
      <div className="login-dialog">
        <div className="login-dialog-titlebar">
          <span>{"\uD83D\uDC1F"}</span> Welcome to FishPosts
        </div>
        <div className="login-dialog-body">
          <div className="login-avatar">{"\uD83D\uDC1F"}</div>
          <div className="login-name">FishPosts</div>
          <div className="login-subtitle">AI Meme Generator</div>
          <button className="login-btn" onClick={onEnter}>
            Log On
          </button>
        </div>
      </div>
    </div>
  );
}
