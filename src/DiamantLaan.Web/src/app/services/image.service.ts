import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProgressImage } from '../models/square';

@Injectable({ providedIn: 'root' })
export class ImageService {
  constructor(private http: HttpClient) {}

  getSquareImages(squareId: number) {
    return this.http.get<ProgressImage[]>(`/api/my-squares/${squareId}/images`);
  }

  fetchImageBlob(imageId: number) {
    return this.http.get(`/api/images/${imageId}`, { responseType: 'blob' });
  }
}
