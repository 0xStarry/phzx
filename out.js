const axios = require("axios");
const readline = require("readline");

// 配置请求的 URL 和 headers
const getFuangyuanUrl =
  "https://p.hangjiayun.com/to/ph66/house/api/newvipapi/esflist";
const FyHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c11)XWEB/11275",
  "Content-Type": "application/json",
  Accept: "*/*",
  xweb_xhr: "1",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  Referer: "https://servicewechat.com/wx20932f891fd20ba6/32/page-frame.html",
};

// 读取命令行输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 用户登录
async function login() {
  return new Promise((resolve, reject) => {
    rl.question("请输入用户名: ", async (username) => {
      rl.question("请输入密码: ", async (password) => {
        const loginData = {
          username,
          password,
          pic_code: "",
        };
        try {
          const response = await axios.post(
            "https://p.hangjiayun.com/to/ph66/urm/uc/api/login",
            loginData,
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c11)XWEB/11275",
                Accept: "application/json, text/plain, */*",
                Origin: "https://p.hangjiayun.com",
                Referer:
                  "https://p.hangjiayun.com/to/ph66/urm/uc/page/redirect?operate=login&project=house&synlogin=&returnUrl=%2Fuc%2Fpage%2FminiProgramRedirector&v=1",
              },
            }
          );
          if (response.data.status) {
            const cookies = response.headers["set-cookie"];
            const hangjiaUserCookie = cookies.find((cookie) =>
              cookie.startsWith("hangjia_user")
            );
            const session = hangjiaUserCookie
              ? hangjiaUserCookie.split(";")[0].split("=")[1]
              : null;
            // console.log("session:", session);
            // 这里模拟登录，实际情况你需要调用登录接口并获取 session 或 token
            console.log(`登录成功，用户名: ${username}`);
            // 模拟一个返回的 hangjia_user 值
            resolve(session);
          } else {
            console.log(`登录失败`);
          }
        } catch (error) {
          // 处理错误
          console.error("登录接口请求出错:", error);
        }
      });
    });
  });
}

// 获取房源数据
async function fetchAllFangyuan(session) {
  let allFangyuan = [];
  let pageCount = 0;
  const params = {
    is_mini: 1,
    platform: "wx",
    _s: 309,
    "3rd_session": session, // 使用登录时获取的 session
    category: 0,
    page: 1,
  };

  try {
    // 初次请求，获取第一页的数据和 page_count
    let response = await axios.get(getFuangyuanUrl, {
      params,
      headers: FyHeaders,
    });
    // 获取 page_count，总页数
    pageCount = response.data.data.page_count || 0;
    // 存储第一页的数据
    allFangyuan = response.data.data.list || [];

    // 循环请求后续页面的数据
    for (let page = 2; page <= pageCount; page++) {
      params.page = page; // 更新页码
      let pageResponse = await axios.get(getFuangyuanUrl, {
        params,
        headers: FyHeaders,
      });
      // 将当前页的数据合并到所有数据中
      allFangyuan = allFangyuan.concat(pageResponse.data.data.list || []);
    }
    return allFangyuan;
  } catch (error) {
    console.error("获取最新的的房源数据条数失败", error);
  }
}

async function updateFangyuan(allFangyuan, session) {
  const filteredFids = allFangyuan
    .filter((item) => item.can_refresh === true)
    .map((item) => item.fid);
  console.log(`未更新的房源的条数： ${filteredFids.length}条`);
  const updateFangyuanUrl =
    "https://p.hangjiayun.com/to/ph66/house/api/newvipapi/setrefresh";
  const updateFangyuanParams = {
    is_mini: 1,
    platform: "wx",
    _s: 503,
    "3rd_session": session,
  };
  try {
    for (const fid of filteredFids) {
      const response = await axios.post(updateFangyuanUrl, null, {
        params: { ...updateFangyuanParams, fid, type: 1 }, // 拼接 fid 和 type=1
      });
      console.log(`房源${fid}:`, response.data.msg);
    }
  } catch (error) {
    console.error(`更新房源${fid}失败:, error`);
  }
}

// 定时获取房源并更新
function startFetchingData(session) {
  // 每隔 30 分钟自动获取未更新的房源并更新
  setInterval(async () => {
    const allFangyuan = await fetchAllFangyuan(session);
    await updateFangyuan(allFangyuan, session);
    // 这里可以做更新操作，比如将数据存储到数据库等
  }, 10 * 60 * 1000); // 每30分钟调用一次 分钟 秒 毫秒
}

// 主程序
async function main() {
  const session = await login(); // 登录并获取 session 值

  //立即进行一次更新
  const allFangyuan = await fetchAllFangyuan(session);
  await updateFangyuan(allFangyuan, session);

  startFetchingData(session); // 启动定时任务，每30分钟更新一次
}

// 启动程序
main();
