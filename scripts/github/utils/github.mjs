export async function github(path, method, body) {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY } = process.env;
  if (!GITHUB_TOKEN || !/^[\w.-]+\/[\w.-]+$/.test(GITHUB_REPOSITORY ?? "")) {
    throw new Error("Set GITHUB_TOKEN and GITHUB_REPOSITORY=owner/repo");
  }
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/${path}`,
    {
      method: method ?? "GET",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok) {
    const error = new Error(`GitHub request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

export async function paginate(path) {
  const results = [];
  for (let page = 1; ; page += 1) {
    const batch = await github(`${path}?per_page=100&page=${page}`);
    results.push(...batch);
    if (batch.length < 100) {
      return results;
    }
  }
}
