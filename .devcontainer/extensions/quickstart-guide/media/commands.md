# Commands reference

Every command works three ways - pick whichever fits your workflow.

| What it does                   | npm                      | make               | mise                   |
| ------------------------------ | ------------------------ | ------------------ | ---------------------- |
| Full first-time setup          | `npm run setup`          | `make setup`       | `mise run setup`       |
| Start developing (port 3000)   | `npm run dev`            | `make dev`         | `mise run dev`         |
| Build frontend for production  | `npm run build`          | `make build`       | `mise run build`       |
| Serve the built frontend       | `npm run start`          | `make start`       | `mise run start`       |
| Stop the local backend         | `npm run stop`           | `make stop`        | `mise run stop`        |
| Install Composer deps only     | `npm run assemble`       | `make assemble`    | `mise run assemble`    |
| (Re-)install the site          | `npm run provision`      | `make provision`   | `mise run provision`   |
| One-time login link            | `npm run login`          | `make login`       | `mise run login`       |
| Environment summary            | `npm run info`           | `make info`        | `mise run info`        |
| Wipe the database, start fresh | `npm run reset`          | `make reset`       | `mise run reset`       |
| Run a Drush command            | `npm run drush -- <cmd>` | `make drush <cmd>` | `mise run drush <cmd>` |

`make drush` only handles plain arguments (`make drush cr all`) - GNU Make
treats anything starting with `-` as its own flag before your Makefile ever
sees it, so flag-style Drush arguments (`--field=...`) need `npm run drush --`
or `mise run drush` instead.

`mise install` pins both the Node and PHP versions this repo uses. nvm
users: `nvm use` pins Node only - install PHP 8.4 (with pdo_sqlite)
separately.
