import { Component, EventEmitter, Input, Output, AfterViewInit, OnChanges, SimpleChanges, ElementRef, inject } from '@angular/core';
import * as L from 'leaflet';
import { Square, SquareStatus, STATUS_LABELS } from '../../../models/square';
import { WAYPOINTS } from '../../map/map-segments';
import { generateSquareGeoJson } from './coordinate-config';

const STATUS_COLORS: Record<number, string> = {
  [SquareStatus.NogNieBeginNie]: '#d1d5db',
  [SquareStatus.Voorberei]:      '#fbbf24',
  [SquareStatus.BesigOmTeTeer]:  '#3b82f6',
  [SquareStatus.KlaarGeteer]:    '#22c55e',
};
const SOLD_COLOR = '#fb923c';
const SELECTED_COLOR = '#f97316';

@Component({
  selector: 'app-road-map',
  standalone: true,
  templateUrl: './road-map.component.html',
  styleUrls: ['./road-map.component.scss'],
})
export class RoadMapComponent implements AfterViewInit, OnChanges {
  @Input() squares: Square[] = [];
  @Input() selectedIds: number[] = [];
  @Input() statusFilter: number | null = null;
  @Output() squareClicked = new EventEmitter<number>();

  private el = inject(ElementRef);
  private map!: L.Map;
  private geoLayer!: L.GeoJSON;
  private initialized = false;

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.initialized) return;
    if (changes['squares'] || changes['selectedIds'] || changes['statusFilter']) {
      this.refreshLayer();
    }
  }

  private initMap() {
    if (this.initialized) return;
    const container: HTMLElement = this.el.nativeElement.querySelector('.map-container');
    if (!container) return;

    const wps = WAYPOINTS;
    const lats = wps.map(w => w.lat);
    const lngs = wps.map(w => w.lng);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    this.map = L.map(container, {
      center: [midLat, midLng],
      zoom: 18,
      minZoom: 16,
      maxZoom: 20,
      zoomControl: true,
      attributionControl: true,
      renderer: L.canvas(),
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
    }).addTo(this.map);

    this.initialized = true;
    this.refreshLayer();
  }

  private refreshLayer() {
    if (!this.initialized) return;
    if (this.geoLayer) {
      this.map.removeLayer(this.geoLayer);
    }

    this.geoLayer = generateSquareGeoJson(this.squares);

    this.geoLayer.setStyle((feature) => {
      const props = feature?.properties;
      const id = props?.['id'] as number;
      const status = (props?.['status'] as number) ?? SquareStatus.NogNieBeginNie;
      const isSold = props?.['isSold'] as boolean;

      let fillColor = STATUS_COLORS[status] ?? STATUS_COLORS[SquareStatus.NogNieBeginNie];
      let fillOpacity = 0.85;
      let strokeColor = '#fff';
      let strokeWeight = 0.5;

      if (status === SquareStatus.NogNieBeginNie && isSold) {
        fillColor = SOLD_COLOR;
      }

      if (this.selectedIds.includes(id)) {
        strokeColor = SELECTED_COLOR;
        strokeWeight = 2;
      }

      if (this.statusFilter !== null && status !== this.statusFilter) {
        fillOpacity = 0.15;
      }

      return {
        fillColor,
        fillOpacity,
        color: strokeColor,
        weight: strokeWeight,
      };
    });

    this.geoLayer.on('click', (e: L.LeafletMouseEvent) => {
      const layer = (e as any).layer;
      const id = layer?.feature?.properties?.id as number;
      if (id != null) {
        this.squareClicked.emit(id);
      }
    });

    this.geoLayer.on('mouseover', (e: L.LeafletMouseEvent) => {
      const layer = (e as any).layer;
      const props = layer?.feature?.properties;
      const id = props?.id as number;
      const status = props?.status as number;
      const isSold = props?.isSold as boolean;
      if (id == null) return;

      let label: string;
      if (status === SquareStatus.NogNieBeginNie && isSold) {
        label = 'Verkoop';
      } else {
        label = STATUS_LABELS[status as SquareStatus] ?? 'Onbekend';
      }
      layer.bindTooltip(`Blok #${id} \u2014 ${label}`, {
        direction: 'top',
        offset: [0, -4],
      }).openTooltip();
    });

    this.geoLayer.on('mouseout', (e: L.LeafletMouseEvent) => {
      const layer = (e as any).layer;
      layer.closeTooltip();
    });

    this.geoLayer.addTo(this.map);
  }
}
