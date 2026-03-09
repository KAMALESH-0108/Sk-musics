async function test() {
  try {
    const targetUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=tamil&limit=1`;
    const response = await fetch(targetUrl);
    const json = await response.json();
    console.log(json.status);
  } catch (e) {
    console.error(e);
  }
}

test();
