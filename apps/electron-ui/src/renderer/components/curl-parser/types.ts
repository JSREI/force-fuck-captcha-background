import { BodyType, FormDataItem } from '../request-body/types';

export interface ParsedCurlResult {
  method: string;
  url: string;
  headers: { key: string; value: string }[];
  params: { key: string; value: string }[];
  bodyType: BodyType;
  bodyContent: string;
  formData: FormDataItem[];
}
