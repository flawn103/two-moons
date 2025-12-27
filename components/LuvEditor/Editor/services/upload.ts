type UploadResult = {
  url: string;
};
export type UploadFn = (file: File) => Promise<UploadResult>;

export class Uploader {
  isUploading = false;
  upload?: UploadFn;

  constructor(upload?: UploadFn) {
    this.upload = upload;
  }

  executeUpload = async (file: File) => {
    if (this.isUploading || !this.upload) return;

    this.isUploading = true;
    const res = await this.upload(file);
    this.isUploading = false;

    return res;
  };
}
