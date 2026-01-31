declare module 'pdf-parse' {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, any>;
    metadata: any;
    text: string;
    version: string;
  }

  interface PDFOptions {
    pagerender?: (pageData: any) => Promise<string>;
    max?: number;
  }

  function pdfParse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export default pdfParse;
}
