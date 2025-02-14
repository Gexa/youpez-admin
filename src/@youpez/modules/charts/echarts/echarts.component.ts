import {
  Component,
  AfterViewInit,
  DoCheck,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core'
import {EChartsOption, ECharts} from 'echarts'
import {fromEvent, Observable, Subscription} from 'rxjs'
import {debounceTime, switchMap} from 'rxjs/operators'
import {init} from 'echarts/lib/echarts'

import 'echarts/lib/chart/line'
import 'echarts/lib/chart/bar'
import 'echarts/lib/chart/pie'
import 'echarts/lib/chart/scatter'
import 'echarts/lib/chart/gauge'
import 'echarts/lib/chart/themeRiver'
import 'echarts/lib/component/legend'
import 'echarts/lib/component/title'

function isChanged(param) {
  if (param && param.previousValue) {
    return true
  }
  return false
}

@Component({
  selector: 'youpez-echarts',
  templateUrl: './echarts.component.html',
  styleUrls: ['./echarts.component.scss']
})
export class EchartsComponent implements OnInit, OnDestroy, OnChanges, DoCheck, AfterViewInit {

  @Input() options: EChartsOption
  @Input() theme: string
  @Input() loading: boolean
  @Input() initOpts: {
    devicePixelRatio?: number
    renderer?: string
    width?: number | string
    height?: number | string
  }
  @Input() merge: EChartsOption
  @Input() autoResize = true
  @Input() forceResize = false
  @Input() loadingType = 'default'
  @Input() loadingOpts: object
  @Input() detectEventChanges = true // deprecated, left for compatibility reasons to avoid triggering major version

  // ngx-echarts events
  @Output() chartInit = new EventEmitter<ECharts>()

  // echarts mouse events
  @Output() chartClick = this.createLazyEvent('click')
  @Output() chartDblClick = this.createLazyEvent('dblclick')
  @Output() chartMouseDown = this.createLazyEvent('mousedown')
  @Output() chartMouseMove = this.createLazyEvent('mousemove')
  @Output() chartMouseUp = this.createLazyEvent('mouseup')
  @Output() chartMouseOver = this.createLazyEvent('mouseover')
  @Output() chartMouseOut = this.createLazyEvent('mouseout')
  @Output() chartGlobalOut = this.createLazyEvent('globalout')
  @Output() chartContextMenu = this.createLazyEvent('contextmenu')

  // echarts mouse events
  @Output() chartLegendSelectChanged = this.createLazyEvent('legendselectchanged')
  @Output() chartLegendSelected = this.createLazyEvent('legendselected')
  @Output() chartLegendUnselected = this.createLazyEvent('legendunselected')
  @Output() chartLegendScroll = this.createLazyEvent('legendscroll')
  @Output() chartDataZoom = this.createLazyEvent('datazoom')
  @Output() chartDataRangeSelected = this.createLazyEvent('datarangeselected')
  @Output() chartTimelineChanged = this.createLazyEvent('timelinechanged')
  @Output() chartTimelinePlayChanged = this.createLazyEvent('timelineplaychanged')
  @Output() chartRestore = this.createLazyEvent('restore')
  @Output() chartDataViewChanged = this.createLazyEvent('dataviewchanged')
  @Output() chartMagicTypeChanged = this.createLazyEvent('magictypechanged')
  @Output() chartPieSelectChanged = this.createLazyEvent('pieselectchanged')
  @Output() chartPieSelected = this.createLazyEvent('pieselected')
  @Output() chartPieUnselected = this.createLazyEvent('pieunselected')
  @Output() chartMapSelectChanged = this.createLazyEvent('mapselectchanged')
  @Output() chartMapSelected = this.createLazyEvent('mapselected')
  @Output() chartMapUnselected = this.createLazyEvent('mapunselected')
  @Output() chartAxisAreaSelected = this.createLazyEvent('axisareaselected')
  @Output() chartFocusNodeAdjacency = this.createLazyEvent('focusnodeadjacency')
  @Output() chartUnfocusNodeAdjacency = this.createLazyEvent('unfocusnodeadjacency')
  @Output() chartBrush = this.createLazyEvent('brush')
  @Output() chartBrushSelected = this.createLazyEvent('brushselected')
  @Output() chartRendered = this.createLazyEvent('rendered')
  @Output() chartFinished = this.createLazyEvent('finished')

  private chart: ECharts
  private currentOffsetWidth = 0
  private currentOffsetHeight = 0
  private currentWindowWidth: number
  private resizeSub: Subscription

  constructor(private el: ElementRef, private ngZone: NgZone) {

  }

  ngOnChanges(changes: SimpleChanges) {
    const {options, merge, loading, theme} = changes

    if (isChanged(options)) {
      this.onOptionsChange(options as unknown as EChartsOption)
    }
    if (isChanged(merge)) {
      this.setOption(merge)
    }
    if (isChanged(loading)) {
      this.toggleLoading(!!loading)
    }
    if (isChanged(theme)) {
      this.refreshChart()
    }
  }

  ngOnInit() {
    this.resizeSub = fromEvent(window, 'resize').pipe(debounceTime(50)).subscribe(() => {
      if ((this.autoResize && window.innerWidth !== this.currentWindowWidth) || this.forceResize) {
        this.currentWindowWidth = window.innerWidth
        this.currentOffsetWidth = this.el.nativeElement.offsetWidth
        this.currentOffsetHeight = this.el.nativeElement.offsetHeight
        this.resize()
      }
    })
  }

  ngOnDestroy() {
    if (this.resizeSub) {
      this.resizeSub.unsubscribe()
    }
    this.dispose()
  }

  ngDoCheck() {
    // No heavy work in DoCheck!
    if (this.chart && this.autoResize) {
      const offsetWidth = this.el.nativeElement.offsetWidth
      const offsetHeight = this.el.nativeElement.offsetHeight

      if (this.currentOffsetWidth !== offsetWidth || this.currentOffsetHeight !== offsetHeight) {
        this.currentOffsetWidth = offsetWidth
        this.currentOffsetHeight = offsetHeight
        this.resize()
      }
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.initChart())
  }

  preventContextMenu($event) {
    $event.preventDefault()
  }

  dispatchAction(action) {
    this.chart.dispatchAction(action)
  }

  private dispose() {
    if (this.chart) {
      this.chart.off('contextmenu')
      this.chart.dispose()
      this.chart = null
    }
  }

  private resize() {
    if (this.chart) {
      this.chart.resize()
    }
  }

  private toggleLoading(loading: boolean) {
    if (this.chart) {
      loading ? this.chart.showLoading(this.loadingType, this.loadingOpts) : this.chart.hideLoading()
    }
  }

  private setOption(option: any, opts?: any) {
    if (this.chart) {
      this.chart.setOption(option, opts)
    }
  }

  public nextOptions(nextOptions) {
    if (this.chart) {
      this.chart.setOption(nextOptions)
    }
  }

  public refreshChart() {
    this.dispose()
    this.initChart()
  }

  private createChart() {
    this.currentWindowWidth = window.innerWidth
    this.currentOffsetWidth = this.el.nativeElement.offsetWidth
    this.currentOffsetHeight = this.el.nativeElement.offsetHeight
    const dom = this.el.nativeElement

    if (window && window.getComputedStyle) {
      const prop = window.getComputedStyle(dom, null).getPropertyValue('height')
      if ((!prop || prop === '0px') &&
        (!dom.style.height || dom.style.height === '0px')) {
        dom.style.height = '400px'
      }
    }

    return this.ngZone.runOutsideAngular(() => init(dom, this.theme ? this.theme : 'default', this.initOpts))
  }

  private initChart() {
    this.onOptionsChange(this.options)

    if (this.merge && this.chart) {
      this.setOption(this.merge)
    }
  }

  private onOptionsChange(opt: EChartsOption) {
    if (opt) {
      if (!this.chart) {
        this.chart = this.createChart()
        this.chart.on('contextmenu', function (params) {
          params.event.event.preventDefault()
        })
        this.chartInit.emit(this.chart)
      }

      this.chart.setOption(this.options, true)
    }
  }

  // allows to lazily bind to only those events that are requested through the `@Output` by parent components
  // see https://stackoverflow.com/questions/51787972/optimal-reentering-the-ngzone-from-eventemitter-event for more info
  private createLazyEvent<T>(eventName: string): EventEmitter<T> {
    return this.chartInit.pipe(
      switchMap((chart: ECharts) => new Observable(observer => {
        chart.on(eventName, (data: T) => this.ngZone.run(() => observer.next(data)))
        return () => chart.off(eventName)
      }))
    ) as EventEmitter<T>
  }

}
