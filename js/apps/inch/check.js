export const check = async (val = 500) => {
  try {
    const str = '000000000000000000';
    const amount = val + str;
    const time = new Date().valueOf();

    const usdc = await fetch(
      `https://pathfinder-v3.1inch.io/v1.1/quotes-by-presets?chainId=1&fromTokenAddress=0x4e352cf164e64adcbad318c3a1e222e9eba4ce42&toTokenAddress=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&amount=${amount}&gasPrice=92000000000&maxReturnProtocols=UNISWAP_V3&time=${time}`,
      {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'en',
          'sec-ch-ua':
            '"Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
        },
        referrer: 'https://app.1inch.io/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: null,
        method: 'GET',
        mode: 'cors',
      }
    )
      .then((r) => r.json())
      .then((r) => r?.maxReturnResult?.toTokenAmount);

    let mcb = await fetch(
      `https://pathfinder-arbitrum-42161.1inch.io/v1.1/quotes-by-presets?chainId=42161&fromTokenAddress=0xff970a61a04b1ca14834a43f5de4533ebddb5cc8&toTokenAddress=0x4e352cf164e64adcbad318c3a1e222e9eba4ce42&amount=${usdc}&gasPrice=1427666022&maxReturnProtocols=ARBITRUM_BALANCER_V2,ARBITRUM_ONE_INCH_LIMIT_ORDER,ARBITRUM_DODO,ARBITRUM_DODO_V2,ARBITRUM_SUSHISWAP,ARBITRUM_DXSWAP,ARBITRUM_UNISWAP_V3,ARBITRUM_WETH,ARBITRUM_CURVE,ARBITRUM_CURVE_V2&time=${time}`,
      {
        headers: {
          accept: 'application/json, text/plain, */*',
          'sec-ch-ua':
            '"Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
        },
        referrer: 'https://app.1inch.io/',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: null,
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      }
    )
      .then((r) => r.json())
      .then((r) => r?.maxReturnResult?.toTokenAmount);

    mcb /= 1e18;
    const gap = mcb - val;
    console.log('==========>', gap, usdc / 1e6, mcb);
    return {gap,usdc: usdc/1e6,mcb};
  } catch {
    check();
  }
};
