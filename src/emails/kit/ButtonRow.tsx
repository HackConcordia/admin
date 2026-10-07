/** @jsxRuntime automatic */
// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import { Children, type ReactNode } from "react";
import { CLASS } from "./responsive";

/**
 * One or two buttons side by side. Each cell is inline-block, so on a narrow screen
 * the second button wraps under the first even without <style>; with it (responsive.ts),
 * stacked buttons become equal full-width blocks. Outlook (which ignores inline-block
 * on cells) keeps them side by side.
 */
export function ButtonRow({ children }: { children: ReactNode }) {
  const buttons = Children.toArray(children);
  return (
    <table
      role="presentation"
      className={CLASS.buttonRow}
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={{ margin: "8px 0 16px" }}
    >
      <tbody>
        <tr>
          {buttons.map((button, index) => (
            <td
              key={index}
              className={CLASS.buttonCell}
              valign="top"
              style={{ display: "inline-block", padding: "0 12px 12px 0", verticalAlign: "top" }}
            >
              {button}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
