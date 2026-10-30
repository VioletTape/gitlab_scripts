# Pipeline pumpkins

Install `gitlab-pipeline-pumpkins.user.js` in Tampermonkey by creating a new script,
replacing the editor contents with this file, and saving. Refresh a pipeline page
on `gitlab.planetabax.com`. Disable the script in Tampermonkey to restore the normal icons.

The script embeds all five images, so no image server or additional permissions
are needed. Cropped, transparent originals are in `icons/`.

| Pumpkin | GitLab statuses |
| --- | --- |
| Plain | Pending, created, preparing, waiting for resource, scheduled, manual |
| Smiling | Running |
| Green glow | Success |
| Red glow | Success with warnings |
| Smashed | Failed, canceled |

Pipeline lists and individual pipeline pages receive the icons, including job
statuses on those pages. Links, tooltips, screen reader labels, and actions stay
in place. GitLab's colored circular borders and backgrounds are hidden around
pumpkin icons. Skipped and unknown status icons keep GitLab's original appearance.
Other pages retain their usual icons. No navigation rail controls are added.

Markup reference: [GitLab CiIcon component](https://github.com/gitlabhq/gitlabhq/blob/master/app/assets/javascripts/vue_shared/components/ci_icon/ci_icon.vue).
The script recognizes `#status_*` SVG sprite references with or without
`_borderless`. GitLab markup changes may require a selector update.

Run the local self-check with `node halloween/pumpkins.test.cjs`.
For browser verification, open a pipeline list and pipeline detail, observe a
running job finish, and navigate to another project page. Check the status
tooltips and links, including with the other userscripts enabled.
