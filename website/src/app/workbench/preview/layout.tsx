/**
 * Preview Layout - No Workbench shell
 * 
 * Preview routes render the actual website without Workbench navigation/shell.
 * This makes the iframe display the real website as the visual control surface.
 */

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
