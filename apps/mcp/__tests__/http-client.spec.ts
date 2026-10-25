const mockPost = jest.fn();
const mockGet = jest.fn();
const mockCreateClient = jest.fn((_options: unknown) => ({
  post: mockPost,
  get: mockGet,
}));
jest.mock('@rad-ar/common/http/http-client', () => ({
  createHttpClient: (options: unknown) => mockCreateClient(options),
}));

const originalUrl = process.env.RADAR_API_URL;
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env.RADAR_API_URL = 'http://127.0.0.1:3301/prefix/';
});
afterEach(() => {
  if (originalUrl === undefined) delete process.env.RADAR_API_URL;
  else process.env.RADAR_API_URL = originalUrl;
});

it('preserves search payload, URL prefix, JSON header, and the MCP timeout override', async () => {
  mockPost.mockResolvedValue({ data: { jobs: [] } });
  const { searchJobs } = await import('../src/tools');
  await searchJobs({
    query: 'TypeScript',
    source: 'greenhouse',
    company: 'acme',
    limit: 500,
  });
  expect(mockCreateClient).toHaveBeenCalledWith({ timeout: 60, retries: 0 });
  expect(mockPost).toHaveBeenCalledWith(
    'http://127.0.0.1:3301/prefix/api/jobs/search',
    {
      search_term: 'TypeScript',
      location: '',
      site_type: ['greenhouse'],
      company_slug: 'acme',
      results_wanted: 100,
    },
    { headers: { 'Content-Type': 'application/json' } },
  );
});

it('preserves detail query parameters through the shared client', async () => {
  mockGet.mockResolvedValue({ data: {} });
  const { getJobDetails } = await import('../src/tools');
  await getJobDetails({ jobId: 'job-1' });
  expect(mockGet).toHaveBeenCalledWith(
    'http://127.0.0.1:3301/prefix/api/jobs/details',
    {
      headers: { 'Content-Type': 'application/json' },
      params: { url: undefined, id: 'job-1' },
    },
  );
});
