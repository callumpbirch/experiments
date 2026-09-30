import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir:"./e2e",fullyParallel:false,workers:1,
  timeout:60_000,expect:{timeout:12_000},
  use:{baseURL:"http://localhost:3000",trace:"retain-on-failure",screenshot:"only-on-failure"},
  reporter:[["list"],["html",{open:"never"}]],
  webServer:{command:"npm run start",url:"http://localhost:3000/start",reuseExistingServer:!process.env.CI,timeout:120_000},
  projects:[{name:"chromium",use:{browserName:"chromium"}}]
});
