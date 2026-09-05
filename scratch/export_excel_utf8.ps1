$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open("d:\Claude\ndd\Danh-muc-Phuong-xa_moi_34-tinh-thanh-sau-sat-nhap.xlsx")
$ws = $wb.Sheets.Item(1)

$rowCount = $ws.UsedRange.Rows.Count
$colCount = $ws.UsedRange.Columns.Count
$arr = $ws.UsedRange.Value2

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host "Read array rows:" $rowCount "cols:" $colCount

$data = @()
for ($r = 2; $r -le $rowCount; $r++) {
    $stt = [string]$arr[$r, 1]
    $maTinhBNV = [string]$arr[$r, 2]
    $tenTinhTP = [string]$arr[$r, 3]
    $maTinhTMS = [string]$arr[$r, 4]
    $maQuanHuyenTMS = [string]$arr[$r, 5]
    $tenQuanHuyenTMS = [string]$arr[$r, 6]
    $soTTTuong = [string]$arr[$r, 7]
    $maPhuongXaMoi = [string]$arr[$r, 8]
    $tenPhuongXaMoi = [string]$arr[$r, 9]
    $trangThai = [string]$arr[$r, 10]

    if ($tenTinhTP -and $tenPhuongXaMoi) {
        $item = [PSCustomObject]@{
            stt = $stt
            maTinhBNV = $maTinhBNV
            tenTinhTP = $tenTinhTP.Trim()
            maTinhTMS = $maTinhTMS
            maQuanHuyenTMS = $maQuanHuyenTMS
            tenQuanHuyenTMS = if ($tenQuanHuyenTMS) { $tenQuanHuyenTMS.Trim() } else { "" }
            maPhuongXaMoi = $maPhuongXaMoi
            tenPhuongXaMoi = $tenPhuongXaMoi.Trim()
            trangThai = if ($trangThai) { $trangThai.Trim() } else { "" }
        }
        $data += $item
    }
}

$jsonPath = "d:\Claude\ndd\scratch\excel_data_utf8.json"
$data | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding UTF8
Write-Host "Successfully exported" $data.Count "records to $jsonPath"
