import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as L from 'leaflet';
import { RoadMapComponent } from './road-map.component';
import { getMapBounds } from './coordinate-config';

describe('RoadMapComponent', () => {
  let fixture: ComponentFixture<RoadMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoadMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RoadMapComponent);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('opens square info tooltips when a square is clicked', () => {
    fixture.detectChanges();

    const geoLayer = (fixture.componentInstance as unknown as { geoLayer: L.GeoJSON }).geoLayer;
    let firstLayer: L.Layer | undefined;

    geoLayer.eachLayer(layer => {
      firstLayer ??= layer;
    });

    expect(firstLayer).toBeDefined();
    spyOn(firstLayer as L.Layer & { openTooltip: () => L.Layer }, 'openTooltip');

    firstLayer!.fire('mouseover');
    expect((firstLayer as L.Layer & { openTooltip: () => L.Layer }).openTooltip).not.toHaveBeenCalled();

    firstLayer!.fire('click');

    expect((firstLayer as L.Layer & { openTooltip: () => L.Layer }).openTooltip).toHaveBeenCalled();
  });

  it('restyles the existing geo layer when selectedIds changes', () => {
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as { geoLayer: L.GeoJSON };
    const initialGeoLayer = component.geoLayer;
    expect(initialGeoLayer).toBeDefined();

    spyOn(initialGeoLayer, 'setStyle').and.callThrough();

    fixture.componentRef.setInput('selectedIds', [1]);
    fixture.detectChanges();

    expect(component.geoLayer).toBe(initialGeoLayer);
    expect(initialGeoLayer.setStyle).toHaveBeenCalled();
  });

  it('initializes with zoom 20 and constrained map bounds', () => {
    fixture.detectChanges();

    const map = (fixture.componentInstance as unknown as { map: L.Map }).map;
    expect(map.getZoom()).toBe(20);

    const expectedBounds = getMapBounds();
    const maxBounds = map.options.maxBounds as L.LatLngBounds | undefined;
    expect(maxBounds).toBeDefined();
    expect(maxBounds!.getSouthWest().lat).toBeCloseTo(expectedBounds.getSouthWest().lat, 4);
    expect(maxBounds!.getNorthEast().lng).toBeCloseTo(expectedBounds.getNorthEast().lng, 4);
  });
});
