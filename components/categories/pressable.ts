/**
 * Props that make a non-button element (a row that contains its own buttons)
 * act like a button: focusable, clickable, and activated by Enter / Space.
 */
export function pressable(onPress: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onPress,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPress();
      }
    },
  };
}
