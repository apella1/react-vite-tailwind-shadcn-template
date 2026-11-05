import { useTheme } from "@/hooks/useTheme";
import { BOARD_THEMES, PIECE_STYLES } from "@/lib/theme";

/**
 * Inline theme selector for the game review pane.
 * Lets the user switch board colors and piece styles while viewing a game.
 * All colors are defined centrally in src/lib/theme.ts for easy plug-and-play.
 */
export default function ThemeSelector() {
  const { settings, update } = useTheme();

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-muted-foreground">Board</span>
      <select
        value={settings.boardThemeId}
        onChange={(e) => update({ ...settings, boardThemeId: e.target.value })}
        className="rounded border bg-background px-2 py-1"
      >
        {BOARD_THEMES.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <span className="font-medium text-muted-foreground">Pieces</span>
      <select
        value={settings.pieceStyleId}
        onChange={(e) => update({ ...settings, pieceStyleId: e.target.value })}
        className="rounded border bg-background px-2 py-1"
      >
        {PIECE_STYLES.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
