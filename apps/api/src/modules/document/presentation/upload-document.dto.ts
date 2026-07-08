export interface UploadDocumentFields {
  projectId: string;
  projectRevisionId: string;
  fileType: 'DWG' | 'DXF' | 'PDF' | 'IFC' | 'IMAGE';
}
