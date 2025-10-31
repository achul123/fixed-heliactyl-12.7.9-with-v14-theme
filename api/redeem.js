const indexjs = require("../index.js");
const log = require('../misc/log.js')

module.exports.load = async function(app, db) {
  app.get("/coupon_redeem", async (req, res) => {
    if (!req.session.pterodactyl) return res.redirect("/login");

    let theme = indexjs.get(req);

    let code = req.query.code ? req.query.code.slice(0, 200) : Math.random().toString(36).substring(2, 15);

    if (!code) return res.redirect(theme.settings.redirect.missingorinvalidcouponcode + "?err=MISSINGCOUPONCODE");

    let couponinfo = await db.get("coupon-" + code);

    /*
    {
      ram: x,
      disk: x,
      cpu: x,
      servers: x,
      coins: x
    }
    */

    if (!couponinfo) return res.redirect(theme.settings.redirect.missingorinvalidcouponcode + "?err=INVALIDCOUPONCODE");

    await db.delete("coupon-" + code);

    let extra = await db.get("extra-" + req.session.userinfo.id) || {
      ram: 0,
      disk: 0,
      cpu: 0,
      servers: 0
    };

    // Assign values to the variables
    let { ram, disk, cpu, servers, coins } = couponinfo;

    extra.ram = Math.min(extra.ram + (ram || 0), 999999999999999);
    extra.disk = Math.min(extra.disk + (disk || 0), 999999999999999);
    extra.cpu = Math.min(extra.cpu + (cpu || 0), 999999999999999);
    extra.servers = Math.min(extra.servers + (servers || 0), 999999999999999);

    await db.set("extra-" + req.session.userinfo.id, extra);

    let userCoins = await db.get("coins-" + req.session.userinfo.id) || 0;
    userCoins = userCoins + coins;
    await db.set("coins-" + req.session.userinfo.id, userCoins);

    log(`coupon redeemed`, `${req.session.userinfo.username}#${req.session.userinfo.discriminator} redeemed the coupon code \`${code}\` which gives:\`\`\`coins: ${coins}\nMemory: ${ram} MB\nDisk: ${disk} MB\nCPU: ${cpu}%\nServers: ${servers}\`\`\``);

    res.redirect(theme.settings.redirect.successfullyredeemedcoupon + "?err=SUCCESSCOUPONCODE");
  });
}