declare module "youtube-dl-exec" {
  interface YtDlpOptions {
    dumpSingleJson?: boolean;
    noCheckCertificates?: boolean;
    noWarnings?: boolean;
    preferFreeFormats?: boolean;
    addHeaders?: string[];
    format?: string;
    [key: string]: unknown;
  }

  function youtubeDl(url: string, options?: YtDlpOptions): Promise<unknown>;
  export = youtubeDl;
}
