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
const DRAG_THRESHOLD = 5;

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
  @Output() squaresRangeSelected = new EventEmitter<number[]>();

  selectMode = false;

  private el = inject(ElementRef);
  private map!: L.Map;
  private geoLayer!: L.GeoJSON;
  private initialized = false;

  private isDragging = false;
  private dragStartPoint: L.Point | null = null;
  private selectBox: L.Rectangle | null = null;

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.initialized) return;
    if (changes['squares'] || changes['selectedIds'] || changes['statusFilter']) {
      this.refreshLayer();
    }
  }

  toggleSelectMode() {
    this.selectMode = !this.selectMode;
    if (!this.map) return;

    if (this.selectMode) {
      this.map.dragging.disable();
    } else {
      this.map.dragging.enable();
      this.cancelSelection();
    }
  }

  private cancelSelection() {
    if (this.selectBox) {
      this.map.removeLayer(this.selectBox);
      this.selectBox = null;
    }
    this.isDragging = false;
    this.dragStartPoint = null;
    this.map.getContainer().style.cursor = '';
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
      maxZoom: 22,
      zoomControl: true,
      attributionControl: true,
      renderer: L.canvas(),
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 22,
      maxNativeZoom: 19,
    }).addTo(this.map);

    this.setupDragSelect();
    this.initialized = true;
    this.refreshLayer();
  }

  private setupDragSelect() {
    const getContainerPoint = (e: MouseEvent): L.Point => {
      const rect = this.map.getContainer().getBoundingClientRect();
      return L.point(e.clientX - rect.left, e.clientY - rect.top);
    };

    this.map.getContainer().addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.selectMode) return;
      this.dragStartPoint = getContainerPoint(e);
      this.isDragging = false;
    });

    this.map.getContainer().addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.selectMode || !this.dragStartPoint) return;

      const current = getContainerPoint(e);
      const dist = this.dragStartPoint.distanceTo(current);

      if (dist > DRAG_THRESHOLD && !this.isDragging) {
        this.isDragging = true;
        this.map.getContainer().style.cursor = 'crosshair';
      }

      if (this.isDragging) {
        this.updateSelectBox(current);
      }
    });

    const finishDrag = () => {
      if (!this.selectMode) return;

      if (this.selectBox) {
        const bounds = this.selectBox.getBounds();
        this.map.removeLayer(this.selectBox);
        this.selectBox = null;

        const ids: number[] = [];
        this.geoLayer.eachLayer((layer: any) => {
          if (layer.getBounds && bounds.intersects(layer.getBounds())) {
            const id = layer.feature?.properties?.id;
            if (id != null) ids.push(id);
          }
        });

        if (ids.length > 0) {
          this.squaresRangeSelected.emit(ids);
        }
      }

      this.isDragging = false;
      this.dragStartPoint = null;
      this.map.getContainer().style.cursor = '';
    };

    this.map.getContainer().addEventListener('mouseup', finishDrag);
    this.map.getContainer().addEventListener('mouseleave', finishDrag);
  }

  private updateSelectBox(current: L.Point) {
    if (!this.dragStartPoint) return;

    if (this.selectBox) {
      this.map.removeLayer(this.selectBox);
    }

    const p1 = this.map.containerPointToLatLng(this.dragStartPoint);
    const p2 = this.map.containerPointToLatLng(current);
    const bounds = L.latLngBounds(p1, p2);

    this.selectBox = L.rectangle(bounds, {
      color: '#f97316',
      weight: 1,
      fillOpacity: 0.1,
      fillColor: '#f97316',
      interactive: false,
    }).addTo(this.map);
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
      if (this.isDragging) return;
      const layer = (e as any).layer;
      const id = layer?.feature?.properties?.id as number;
      if (id != null) {
        this.squareClicked.emit(id);
      }
    });

    this.geoLayer.on('mouseover', (e: L.LeafletMouseEvent) => {
      if (this.isDragging) return;
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
