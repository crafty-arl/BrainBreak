'use client';

interface LetterKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  maxLength?: number;
}

export default function LetterKeyboard({ value, onChange, onSubmit, maxLength = 5 }: LetterKeyboardProps) {
  const letters = [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
    ['V', 'W', 'X', 'Y', 'Z', '⌫', '✓']
  ];

  const handleLetterClick = (letter: string) => {
    if (letter === '⌫') {
      onChange(value.slice(0, -1));
    } else if (letter === '✓') {
      if (value.length > 0) {
        onSubmit(value);
      }
    } else if (value.length < maxLength) {
      onChange(value + letter);
    }
  };

  return (
    <div className="bg-gray-800 p-2 sm:p-4 rounded-t-lg w-full max-w-md mx-auto">
      <div className="mb-2 sm:mb-4 text-center">
        <input
          type="text"
          value={value}
          readOnly
          className="bg-gray-700 text-white text-xl sm:text-2xl p-2 rounded text-center w-32 sm:w-40"
          placeholder="NAME"
        />
      </div>
      <div className="grid gap-1 sm:gap-2">
        {letters.map((row, i) => (
          <div key={i} className="flex justify-center gap-1 sm:gap-2">
            {row.map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterClick(letter)}
                className={`
                  w-8 h-8 sm:w-12 sm:h-12 rounded
                  ${letter === '✓' ? 'bg-green-600' : 'bg-gray-700'}
                  ${letter === '⌫' ? 'bg-red-600' : ''}
                  text-white text-sm sm:text-xl font-bold
                  hover:opacity-80 active:opacity-60
                  transition-opacity
                `}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}