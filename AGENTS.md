# GitLab userscript instructions

This repository contains independent Tampermonkey userscripts for `gitlab.planetabax.com`. Keep each script self-contained in its own folder and follow the surrounding `*.user.js` metadata and vanilla JavaScript style.

## Navigation rail controls

- Put global rail controls in `.ai-navigation-rail [role="tablist"]` and give every control a unique `tm-` ID.
- Keep controls in ascending `data-tm-rail-order` order. Existing values are copy clone command `10` and collapse issuable details `20`; use another unique value for new controls, with gaps left for future additions.
- Place a control before the first existing control with a higher order, or append it if there is none. Only move it when its parent or position is wrong. Do not force a control to the end on every sync; the userscripts observe the same DOM, so doing so can create an endless mutation loop.
- Do not use a decorative divider as an ordering anchor. Remove or add only the current script's own control when its page condition changes.
- Give icon buttons a useful `title` and `aria-label`. For Lucide line icons, set `fill: none` and `stroke: currentColor` on the scoped SVG rule so GitLab styles do not fill the icon.

When adding a button, use this placement pattern and give it the script's priority:

```js
const placeInRailOrder = (button, tabList) => {
  const order = Number(button.dataset.tmRailOrder);
  const nextButton = [...tabList.querySelectorAll('[data-tm-rail-order]')]
    .find((candidate) => candidate !== button && Number(candidate.dataset.tmRailOrder) > order);
  if (button.parentElement !== tabList || (nextButton && button.nextElementSibling !== nextButton)) {
    tabList.insertBefore(button, nextButton);
  }
};
```

## DOM observers and navigation

- Make each `sync` idempotent: once the DOM is correct, another observer callback must not move or recreate controls.
- Observe only the DOM changes the script needs. Remember that the script's own insertions trigger its observer and other userscripts' observers.
- Remove only elements owned by the current script. Account for GitLab client-side navigation when a control depends on the URL or page content.

## Clone command

The clone button uses the URL path before GitLab's `/-/` route separator as the project path, trims surrounding slashes, and skips pages whose first path segment is `dashboard`. Project root pages have no `/-/` separator, so use `window.gon.current_project_id` to distinguish a project page from other GitLab routes. The command format is `git clone git@gitlab.planetabax.com:<project-path>.git`.

## Manual check

When changing shared rail behavior, check both scripts enabled together on a project page. Confirm the controls stay ordered without repeated DOM moves, the copy button copies the expected path, the collapse button still works, and the clone button is absent on the dashboard.
