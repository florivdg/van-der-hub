# Default Browser Backend

This broadcasts my current default browser to the interwebs.  
Made with Deno.

## Usage

```shell
deno task start
```

Make sure to set a `TOKEN` env var in order protect set `/set` route.

## Docker

### Build

```shell
docker build --pull -t florivdg/default-browser-backend:0.1.0 .
```

### Run

```shell
docker run --name default-browser-backend --rm --env-file ./.env -p 8686:8686 -p 8787:8787 florivdg/default-browser-backend:0.1.0
```
