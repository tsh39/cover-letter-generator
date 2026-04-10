export default function LetterDisplay({ letterText }) {
  if (!letterText) return null;

  return (
    <div className="view-enter">
      <div className="letter-container">
        <p className="letter-text">{letterText}</p>
      </div>
    </div>
  );
}
