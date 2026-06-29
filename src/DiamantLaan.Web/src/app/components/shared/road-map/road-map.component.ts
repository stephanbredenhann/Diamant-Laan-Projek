import { Component, EventEmitter, Input, Output, AfterViewInit, OnChanges, SimpleChanges, ElementRef, inject } from '@angular/core';
import * as L from 'leaflet';
import { Square, SquareStatus, STATUS_LABELS, STATUS_COLORS, MapViewMode } from '../../../models/square';
import { WAYPOINTS } from '../../map/map-segments';
import { generateSquareGeoJson, getMapBounds } from './coordinate-config';

const SOLD_COLOR = '#C67B5C';
const AVAILABLE_COLOR = '#D4C4A8';
const SELECTED_FILL = '#F5A623';
const SELECTED_STROKE = '#3D2B1F';
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
  @Input() viewMode: MapViewMode = 'status';
  @Output() squareClicked = new EventEmitter<number>();
  @Output() squaresRangeSelected = new EventEmitter<number[]>();

  selectMode = false;

  private el = inject(ElementRef);
  private map!: L.Map;
  private geoLayer!: L.GeoJSON;
  private initialized = false;
  private selectedIdSet = new Set<number>();

  private isDragging = false;
  private dragStartPoint: L.Point | null = null;
  private selectBox: L.Rectangle | null = null;
  private activeTooltipLayer: L.Layer | null = null;

  ngAfterViewInit() {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.initialized) return;

    if (changes['squares']) {
      this.rebuildLayer();
      return;
    }

    if (changes['selectedIds'] || changes['statusFilter'] || changes['viewMode']) {
      this.syncSelectedIdSet();
      this.applyStyles();
    }
  }

  toggleSelectMode() {
    this.selectMode = !this.selectMode;
    if (!this.map) return;

    if (this.selectMode) {
      this.map.dragging.disable();
      // Prevent the browser from scrolling the page while box-selecting on touch.
      this.map.getContainer().style.touchAction = 'none';
    } else {
      this.map.dragging.enable();
      this.map.getContainer().style.touchAction = '';
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
      zoom: 20,
      minZoom: 16,
      maxZoom: 22,
      maxBounds: getMapBounds(),
      maxBoundsViscosity: 1.0,
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
    this.syncSelectedIdSet();
    this.rebuildLayer();
    setTimeout(() => this.map.invalidateSize(), 100);
  }

  private syncSelectedIdSet() {
    this.selectedIdSet = new Set(this.selectedIds);
  }

  private setupDragSelect() {
    const container = this.map.getContainer();

    const getContainerPoint = (e: PointerEvent): L.Point => {
      const rect = container.getBoundingClientRect();
      return L.point(e.clientX - rect.left, e.clientY - rect.top);
    };

    container.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.selectMode) return;
      this.dragStartPoint = getContainerPoint(e);
      this.isDragging = false;
    });

    container.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.selectMode || !this.dragStartPoint) return;

      const current = getContainerPoint(e);
      const dist = this.dragStartPoint.distanceTo(current);

      if (dist > DRAG_THRESHOLD && !this.isDragging) {
        this.isDragging = true;
        container.style.cursor = 'crosshair';
        // Keep receiving move/up events even if the pointer leaves the container.
        container.setPointerCapture?.(e.pointerId);
      }

      if (this.isDragging) {
        // Stop the browser from scrolling/panning the page while box-selecting on touch.
        e.preventDefault();
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
        this.geoLayer.eachLayer((layer: L.Layer) => {
          const geoLayer = layer as L.Layer & { getBounds?: () => L.LatLngBounds; feature?: GeoJSON.Feature };
          if (geoLayer.getBounds && bounds.intersects(geoLayer.getBounds())) {
            const id = geoLayer.feature?.properties?.['id'];
            if (id != null) ids.push(id as number);
          }
        });

        if (ids.length > 0) {
          this.squaresRangeSelected.emit(ids);
        }
      }

      this.isDragging = false;
      this.dragStartPoint = null;
      container.style.cursor = '';
    };

    container.addEventListener('pointerup', finishDrag);
    container.addEventListener('pointercancel', finishDrag);
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
      color: '#C67B5C',
      weight: 1,
      fillOpacity: 0.1,
      fillColor: '#C67B5C',
      interactive: false,
    }).addTo(this.map);
  }

  private rebuildLayer() {
    if (!this.initialized) return;

    if (this.geoLayer) {
      this.map.removeLayer(this.geoLayer);
    }
    this.activeTooltipLayer = null;

    this.geoLayer = generateSquareGeoJson(this.squares);
    this.bindSquareInteractions();
    this.applyStyles();
    this.geoLayer.addTo(this.map);
  }

  private applyStyles() {
    if (!this.geoLayer) return;

    this.geoLayer.setStyle((feature) => {
      const props = feature?.properties;
      const id = props?.['id'] as number;
      const status = (props?.['status'] as number) ?? SquareStatus.NogNieBeginNie;
      const isSold = props?.['isSold'] as boolean;

      let fillColor: string;
      let fillOpacity = 0.85;
      let strokeColor = '#fff';
      let strokeWeight = 0.5;

      if (this.viewMode === 'availability') {
        fillColor = isSold ? SOLD_COLOR : AVAILABLE_COLOR;
      } else {
        fillColor = STATUS_COLORS[status] ?? STATUS_COLORS[SquareStatus.NogNieBeginNie];
        if (status === SquareStatus.NogNieBeginNie && isSold) {
          fillColor = SOLD_COLOR;
        }
      }

      if (this.selectedIdSet.has(id)) {
        fillColor = SELECTED_FILL;
        fillOpacity = 0.95;
        strokeColor = SELECTED_STROKE;
        strokeWeight = 3;
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
  }

  private bindSquareInteractions() {
    this.geoLayer.eachLayer((layer: L.Layer) => {
      const props = (layer as L.Layer & { feature?: GeoJSON.Feature }).feature?.properties;
      const id = props?.['id'] as number | undefined;
      if (id == null) return;

      layer.bindTooltip(
        this.buildTooltipHtml(id, props?.['status'] as number | undefined, props?.['isSold'] === true),
        {
          sticky: true,
          direction: 'top',
          offset: [0, -10],
          className: 'block-info-tooltip',
        },
      );
      this.disableAutomaticTooltipEvents(layer);

      layer.on('click', () => {
        if (this.isDragging) {
          layer.closeTooltip();
          return;
        }

        if (this.activeTooltipLayer && this.activeTooltipLayer !== layer) {
          this.activeTooltipLayer.closeTooltip();
        }

        layer.openTooltip();
        this.activeTooltipLayer = layer;
        this.squareClicked.emit(id);
      });
    });
  }

  private disableAutomaticTooltipEvents(layer: L.Layer) {
    (layer as L.Layer & { _initTooltipInteractions?: (remove?: boolean) => void })._initTooltipInteractions?.(true);
  }

  private buildTooltipHtml(id: number, status: number | undefined, isSold: boolean): string {
    const statusValue = status ?? SquareStatus.NogNieBeginNie;
    const statusLabel = statusValue === SquareStatus.NogNieBeginNie && isSold
      ? 'Verkoop'
      : STATUS_LABELS[statusValue as SquareStatus] ?? 'Onbekend';
    const availability = isSold ? 'Verkoop' : 'Beskikbaar';

    return `
      <div class="block-bubble">
        <div class="block-bubble-id">Blok #${id}</div>
        <div class="block-bubble-row"><span>Status:</span> ${statusLabel}</div>
        <div class="block-bubble-row"><span>Beskikbaarheid:</span> ${availability}</div>
      </div>
    `;
  }
}
