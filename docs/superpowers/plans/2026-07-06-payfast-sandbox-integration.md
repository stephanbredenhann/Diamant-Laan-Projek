# PayFast Sandbox One-Off Payment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Follow `superpowers:test-driven-development` inside each task.

**Goal:** Add PayFast sandbox one-off payments to Diamant Laan. All payment confirmation happens server-side via PayFast ITN; the frontend never confirms a payment and only redirects the buyer to and from PayFast.

**Architecture:** A new `PayFastService` signs outgoing payment requests and verifies incoming ITN callbacks (signature, amount, server confirmation). `PurchaseController` creates a **pending** purchase that reserves squares, and exposes a `/pay` endpoint that returns PayFast form fields. A new anonymous `PaymentController` receives ITN callbacks and finalises the purchase. The Angular `PaymentComponent` creates the pending purchase, auto-submits the PayFast form, and the new return/cancel components show outcomes based only on the server-side purchase status.

**Tech Stack:** ASP.NET Core 8, EF Core SQLite, Angular 19, xUnit, `IHostedService` for reservation cleanup.

---

## File Structure

| Responsibility | File |
|---|---|
| PayFast configuration | `src/DiamantLaan.Api/Models/PayFastSettings.cs` |
| PayFast business logic | `src/DiamantLaan.Api/Services/PayFastService.cs` |
| PayFast DI abstraction | `src/DiamantLaan.Api/Services/IPayFastService.cs` |
| Payment request DTO | `src/DiamantLaan.Api/Models/Dtos/PayFastPaymentRequestDto.cs` |
| ITN result record | `src/DiamantLaan.Api/Models/Dtos/ItnVerificationResult.cs` |
| ITN controller | `src/DiamantLaan.Api/Controllers/PaymentController.cs` |
| Pending purchase cleanup | `src/DiamantLaan.Api/Services/PendingReservationCleanupService.cs` |
| Purchase model extensions | `src/DiamantLaan.Api/Models/Purchase.cs` |
| Payment status enum | `src/DiamantLaan.Api/Models/Enums/PaymentStatus.cs` |
| Purchase endpoint changes | `src/DiamantLaan.Api/Controllers/PurchaseController.cs` |
| DI / config wiring | `src/DiamantLaan.Api/Program.cs`, `src/DiamantLaan.Api/appsettings.json` |
| Frontend payment service | `src/DiamantLaan.Web/src/app/services/purchase.service.ts` |
| Frontend payment component | `src/DiamantLaan.Web/src/app/components/payment/payment.component.ts` |
| Frontend return component | `src/DiamantLaan.Web/src/app/components/payment-return/payment-return.component.ts` |
| Frontend cancel component | `src/DiamantLaan.Web/src/app/components/payment-cancel/payment-cancel.component.ts` |
| Frontend routes | `src/DiamantLaan.Web/src/app/app.routes.ts` |
| Unit tests | `tests/DiamantLaan.Api.Tests/Services/PayFastServiceTests.cs` |
| Test project | `tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj` |

---

## Shared Specification (read before every task)

### PayFast signature algorithm

Use **PHP `urlencode` semantics**:
- Space → `+`.
- All other non-alphanumeric characters except `-`, `_`, `.` are percent-encoded with **upper-case** hex.
- Empty values are omitted from the signature string.

Build string in the documented attribute order, for one-off payments this is:
`merchant_id`, `merchant_key`, `return_url`, `cancel_url`, `notify_url`, `name_first`, `name_last`, `email_address`, `cell_number`, `m_payment_id`, `amount`, `item_name`, `item_description`.
(Only include the fields that are actually sent and non-empty.)

Concatenate as `key=value&key=value&...`, remove the trailing `&`, then append `&passphrase={urlencode(passphrase)}`. MD5 the whole string.

### Sandbox credentials (public test values)

```json
{
  "MerchantId": "10000100",
  "MerchantKey": "46f0cd694581a",
  "Passphrase": "jt7NOE43FZPn"
}
```

### PayFast endpoints

| Mode | Process URL | Query/validate URL |
|---|---|---|
| Sandbox | `https://sandbox.payfast.co.za/eng/process` | `https://sandbox.payfast.co.za/eng/query/validate` |
| Live | `https://www.payfast.co.za/eng/process` | `https://www.payfast.co.za/eng/query/validate` |

### ITN validation rules

1. Parse the raw `application/x-www-form-urlencoded` body preserving field order.
2. Build the signature string from all fields **before** the `signature` field, excluding empty values, using the raw encoded values.
3. Append `&passphrase=...` and compare MD5 to the received `signature`.
4. Verify `payment_status` == `COMPLETE`.
5. Verify `amount_gross` matches the purchase amount within `0.01`.
6. POST the same validation string (without signature, without passphrase) to the query/validate URL and expect `VALID`.

### Expected test hashes

For the payload below the MD5 signature must be `a18a81fce9f020f3cc7b901f9b84a5d5`:

```
merchant_id=10000100&merchant_key=46f0cd694581a&return_url=https%3A%2F%2Fwww.example.com%2Freturn&cancel_url=https%3A%2F%2Fwww.example.com%2Fcancel&notify_url=https%3A%2F%2Fwww.example.com%2Fitn&name_first=Test+User&name_last=Doe&email_address=test%2Buser%40example.com&m_payment_id=42&amount=200.00&item_name=Order%2342&passphrase=jt7NOE43FZPn
```

For the ITN payload below (before signature) the MD5 signature must be `4d0496272ebc6f4dd29353bbd71af08b`:

```
m_payment_id=42&pf_payment_id=1089250&payment_status=COMPLETE&item_name=Order%2342&amount_gross=200.00&amount_fee=-4.60&amount_net=195.40&name_first=Test&name_last=User&email_address=test%40example.com&merchant_id=10000100&passphrase=jt7NOE43FZPn
```

---

## Task 1: Add the API test project

**Files:**
- Create: `tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj`
- Modify: `DiamantLaan.sln`

- [ ] **Step 1: Create the test project file**

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.9.0" />
    <PackageReference Include="xunit" Version="2.7.0" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.7">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
    <PackageReference Include="Moq" Version="4.20.70" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\DiamantLaan.Api\DiamantLaan.Api.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 2: Add the test project to the solution**

Run:

```bash
dotnet sln "DiamantLaan.sln" add "tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj"
```

- [ ] **Step 3: Verify the empty project builds**

Run:

```bash
dotnet build "tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj"
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj DiamantLaan.sln
git commit -m "test: add API test project for PayFast integration"
```

---

## Task 2: Implement PayFast signature generation (TDD)

**Files:**
- Create: `src/DiamantLaan.Api/Services/IPayFastService.cs`
- Create: `src/DiamantLaan.Api/Services/PayFastService.cs`
- Create: `tests/DiamantLaan.Api.Tests/Services/PayFastServiceTests.cs`

- [ ] **Step 1: Write the failing signature test**

```csharp
using DiamantLaan.Api.Services;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class PayFastServiceTests
{
    [Fact]
    public void GenerateSignature_ReturnsExpectedHash()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["cancel_url"] = "https://www.example.com/cancel",
            ["notify_url"] = "https://www.example.com/itn",
            ["name_first"] = "Test User",
            ["name_last"] = "Doe",
            ["email_address"] = "test+user@example.com",
            ["m_payment_id"] = "42",
            ["amount"] = "200.00",
            ["item_name"] = "Order#42"
        };

        var signature = PayFastService.GenerateSignature(data, "jt7NOE43FZPn");

        Assert.Equal("a18a81fce9f020f3cc7b901f9b84a5d5", signature);
    }
}
```

Run:

```bash
dotnet test "tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj" --filter "FullyQualifiedName~PayFastServiceTests"
```

Expected: FAIL because `PayFastService` does not exist.

- [ ] **Step 2: Implement the PayFast service with signature generation**

`src/DiamantLaan.Api/Services/IPayFastService.cs`:

```csharp
namespace DiamantLaan.Api.Services;

public interface IPayFastService
{
    string CreateSignature(IDictionary<string, string> data);
}
```

`src/DiamantLaan.Api/Services/PayFastService.cs`:

```csharp
using System.Security.Cryptography;
using System.Text;

namespace DiamantLaan.Api.Services;

public class PayFastService : IPayFastService
{
    private readonly string _passphrase;

    public PayFastService(string passphrase)
    {
        _passphrase = passphrase;
    }

    public string CreateSignature(IDictionary<string, string> data)
    {
        return GenerateSignature(data, _passphrase);
    }

    public static string GenerateSignature(IDictionary<string, string> data, string passphrase)
    {
        var orderedFields = new[]
        {
            "merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
            "name_first", "name_last", "email_address", "cell_number",
            "m_payment_id", "amount", "item_name", "item_description",
            "custom_int1", "custom_int2", "custom_int3", "custom_int4", "custom_int5",
            "custom_str1", "custom_str2", "custom_str3", "custom_str4", "custom_str5",
            "email_confirmation", "confirmation_address", "payment_method",
            "subscription_type", "billing_date", "recurring_amount", "frequency", "cycles"
        };

        var sb = new StringBuilder();
        foreach (var field in orderedFields)
        {
            if (!data.TryGetValue(field, out var value) || string.IsNullOrEmpty(value))
                continue;

            sb.Append(field).Append('=').Append(UrlEncode(value)).Append('&');
        }

        if (sb.Length > 0)
            sb.Length--;

        if (!string.IsNullOrEmpty(passphrase))
        {
            sb.Append("&passphrase=").Append(UrlEncode(passphrase));
        }

        return MD5Hash(sb.ToString());
    }

    public static string UrlEncode(string value)
    {
        var sb = new StringBuilder();
        foreach (var ch in value)
        {
            if (ch == ' ')
            {
                sb.Append('+');
            }
            else if ((ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch == '-' || ch == '_' || ch == '.')
            {
                sb.Append(ch);
            }
            else
            {
                sb.Append('%').Append(((int)ch).ToString("X2"));
            }
        }
        return sb.ToString();
    }

    private static string MD5Hash(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = MD5.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
```

- [ ] **Step 3: Run the test and confirm it passes**

```bash
dotnet test "tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj" --filter "FullyQualifiedName~PayFastServiceTests"
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Api/Services/IPayFastService.cs src/DiamantLaan.Api/Services/PayFastService.cs tests/DiamantLaan.Api.Tests/Services/PayFastServiceTests.cs
git commit -m "feat(payfast): implement PayFast MD5 signature generation"
```

---

## Task 3: Build the PayFast payment request (TDD)

**Files:**
- Create: `src/DiamantLaan.Api/Models/PayFastSettings.cs`
- Create: `src/DiamantLaan.Api/Models/Dtos/PayFastPaymentRequestDto.cs`
- Modify: `src/DiamantLaan.Api/Services/IPayFastService.cs`
- Modify: `src/DiamantLaan.Api/Services/PayFastService.cs`
- Modify: `tests/DiamantLaan.Api.Tests/Services/PayFastServiceTests.cs`

- [ ] **Step 1: Write the failing test for request creation**

```csharp
[Fact]
public void CreatePaymentRequest_IncludesSignedFields()
{
    var settings = new PayFastSettings
    {
        MerchantId = "10000100",
        MerchantKey = "46f0cd694581a",
        Passphrase = "jt7NOE43FZPn",
        Sandbox = true
    };

    var service = new PayFastService(settings, new HttpClient());

    var purchase = new Purchase { Id = 42, Amount = 200.00m, UserId = "user-1" };
    var user = new User { FirstName = "Test User", LastName = "Doe", Email = "test+user@example.com" };

    var request = service.CreatePaymentRequest(purchase, user, "https://www.example.com/");

    Assert.Equal("https://sandbox.payfast.co.za/eng/process", request.ActionUrl);
    Assert.Equal("10000100", request.Fields["merchant_id"]);
    Assert.Equal("42", request.Fields["m_payment_id"]);
    Assert.Equal("200.00", request.Fields["amount"]);
    Assert.True(request.Fields.ContainsKey("signature"));
}
```

Run the test and expect it to fail.

- [ ] **Step 2: Add the settings and DTO classes**

`src/DiamantLaan.Api/Models/PayFastSettings.cs`:

```csharp
namespace DiamantLaan.Api.Models;

public class PayFastSettings
{
    public string MerchantId { get; set; } = string.Empty;
    public string MerchantKey { get; set; } = string.Empty;
    public string Passphrase { get; set; } = string.Empty;
    public bool Sandbox { get; set; } = true;
    public string? ProcessUrl { get; set; }
    public string? QueryUrl { get; set; }
    public string? NotifyUrl { get; set; }
    public bool SkipIpCheck { get; set; }
}
```

`src/DiamantLaan.Api/Models/Dtos/PayFastPaymentRequestDto.cs`:

```csharp
namespace DiamantLaan.Api.Models.Dtos;

public class PayFastPaymentRequestDto
{
    public string ActionUrl { get; set; } = string.Empty;
    public IDictionary<string, string> Fields { get; set; } = new Dictionary<string, string>();
}
```

- [ ] **Step 3: Implement `CreatePaymentRequest`**

Update `IPayFastService`:

```csharp
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Models.Dtos;

namespace DiamantLaan.Api.Services;

public interface IPayFastService
{
    string CreateSignature(IDictionary<string, string> data);
    PayFastPaymentRequestDto CreatePaymentRequest(Purchase purchase, User user, string baseUrl);
}
```

Update `PayFastService` constructor and add method:

```csharp
private readonly PayFastSettings _settings;
private readonly HttpClient _httpClient;

public PayFastService(PayFastSettings settings, HttpClient httpClient)
{
    _settings = settings;
    _httpClient = httpClient;
}

public PayFastPaymentRequestDto CreatePaymentRequest(Purchase purchase, User user, string baseUrl)
{
    var returnUrl = $"{baseUrl}betalings/terug?purchaseId={purchase.Id}";
    var cancelUrl = $"{baseUrl}betalings/kanselleer?purchaseId={purchase.Id}";
    var notifyUrl = _settings.NotifyUrl ?? $"{baseUrl}api/payment/itn";

    var fields = new Dictionary<string, string>
    {
        ["merchant_id"] = _settings.MerchantId,
        ["merchant_key"] = _settings.MerchantKey,
        ["return_url"] = returnUrl,
        ["cancel_url"] = cancelUrl,
        ["notify_url"] = notifyUrl,
        ["name_first"] = user.FirstName,
        ["name_last"] = user.LastName,
        ["email_address"] = user.Email ?? string.Empty,
        ["m_payment_id"] = purchase.Id.ToString(),
        ["amount"] = purchase.Amount.ToString("0.00"),
        ["item_name"] = $"Diamant Laan - Aankoop #{purchase.Id}"
    };

    fields["signature"] = CreateSignature(fields);

    return new PayFastPaymentRequestDto
    {
        ActionUrl = _settings.ProcessUrl ?? (_settings.Sandbox
            ? "https://sandbox.payfast.co.za/eng/process"
            : "https://www.payfast.co.za/eng/process"),
        Fields = fields
    };
}
```

- [ ] **Step 4: Run tests**

```bash
dotnet test "tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj"
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/DiamantLaan.Api/Models/PayFastSettings.cs src/DiamantLaan.Api/Models/Dtos/PayFastPaymentRequestDto.cs src/DiamantLaan.Api/Services/IPayFastService.cs src/DiamantLaan.Api/Services/PayFastService.cs tests/DiamantLaan.Api.Tests/Services/PayFastServiceTests.cs
git commit -m "feat(payfast): build signed PayFast payment request"
```

---

## Task 4: Implement ITN verification (TDD)

**Files:**
- Create: `src/DiamantLaan.Api/Models/Dtos/ItnVerificationResult.cs`
- Modify: `src/DiamantLaan.Api/Services/IPayFastService.cs`
- Modify: `src/DiamantLaan.Api/Services/PayFastService.cs`
- Modify: `tests/DiamantLaan.Api.Tests/Services/PayFastServiceTests.cs`

- [ ] **Step 1: Write the failing ITN verification test**

Add to `PayFastServiceTests.cs`:

```csharp
[Fact]
public async Task VerifyItnAsync_ValidComplete_ReturnsValid()
{
    var settings = new PayFastSettings
    {
        MerchantId = "10000100",
        Passphrase = "jt7NOE43FZPn",
        Sandbox = true,
        SkipIpCheck = true
    };

    var handler = new TestHttpMessageHandler(_ => Task.FromResult(new HttpResponseMessage
    {
        Content = new StringContent("VALID")
    }));
    var client = new HttpClient(handler) { BaseAddress = new Uri("https://sandbox.payfast.co.za/") };

    var service = new PayFastService(settings, client);

    var rawBody = "m_payment_id=42&pf_payment_id=1089250&payment_status=COMPLETE&item_name=Order%2342&amount_gross=200.00&amount_fee=-4.60&amount_net=195.40&name_first=Test&name_last=User&email_address=test%40example.com&merchant_id=10000100&signature=4d0496272ebc6f4dd29353bbd71af08b";

    var result = await service.VerifyItnAsync(rawBody, 200.00m);

    Assert.True(result.IsValid);
    Assert.Equal("COMPLETE", result.PaymentStatus);
    Assert.Equal("1089250", result.PayFastPaymentId);
    Assert.Equal("42", result.MerchantPaymentId);
}
```

Add a minimal `TestHttpMessageHandler` class in the same test file:

```csharp
public class TestHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _responder;
    public TestHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> responder) => _responder = responder;
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => _responder(request);
}
```

Run and expect failure because `VerifyItnAsync` does not exist.

- [ ] **Step 2: Add the ITN result record**

`src/DiamantLaan.Api/Models/Dtos/ItnVerificationResult.cs`:

```csharp
namespace DiamantLaan.Api.Models.Dtos;

public record ItnVerificationResult(
    bool IsValid,
    string? PaymentStatus,
    string? PayFastPaymentId,
    string? MerchantPaymentId,
    decimal? AmountGross,
    string? Error);
```

- [ ] **Step 3: Implement `VerifyItnAsync`**

Update `IPayFastService`:

```csharp
Task<ItnVerificationResult> VerifyItnAsync(string rawBody, decimal expectedAmount);
```

Add to `PayFastService`:

```csharp
public async Task<ItnVerificationResult> VerifyItnAsync(string rawBody, decimal expectedAmount)
{
    var pairs = ParseFormUrlEncoded(rawBody);
    var data = pairs.ToDictionary(p => p.Key, p => p.Value);

    if (!data.TryGetValue("signature", out var receivedSignature))
        return new ItnVerificationResult(false, null, null, null, null, "Missing signature");

    var signatureString = BuildSignatureString(pairs);
    var expectedSignature = GenerateSignatureFromString(signatureString, _settings.Passphrase);

    if (!string.Equals(receivedSignature, expectedSignature, StringComparison.OrdinalIgnoreCase))
        return new ItnVerificationResult(false, null, null, null, null, "Signature mismatch");

    var paymentStatus = data.GetValueOrDefault("payment_status");
    if (paymentStatus != "COMPLETE")
        return new ItnVerificationResult(false, paymentStatus, null, null, null, "Payment not complete");

    var amountGross = data.GetValueOrDefault("amount_gross");
    if (!decimal.TryParse(amountGross, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var grossAmount))
        return new ItnVerificationResult(false, paymentStatus, null, null, null, "Invalid amount");

    if (Math.Abs(grossAmount - expectedAmount) > 0.01m)
        return new ItnVerificationResult(false, paymentStatus, null, null, grossAmount, "Amount mismatch");

    var validationString = BuildValidationString(pairs);
    var queryUrl = _settings.QueryUrl ?? (_settings.Sandbox
        ? "https://sandbox.payfast.co.za/eng/query/validate"
        : "https://www.payfast.co.za/eng/query/validate");

    var response = await _httpClient.PostAsync(queryUrl, new StringContent(validationString, Encoding.UTF8, "application/x-www-form-urlencoded"));
    var responseText = await response.Content.ReadAsStringAsync();

    if (responseText.Trim() != "VALID")
        return new ItnVerificationResult(false, paymentStatus, null, null, grossAmount, "Server confirmation failed");

    return new ItnVerificationResult(
        true,
        paymentStatus,
        data.GetValueOrDefault("pf_payment_id"),
        data.GetValueOrDefault("m_payment_id"),
        grossAmount,
        null);
}
```

Add helper methods inside `PayFastService`:

```csharp
private static List<KeyValuePair<string, string>> ParseFormUrlEncoded(string rawBody)
{
    var pairs = new List<KeyValuePair<string, string>>();
    foreach (var part in rawBody.Split('&', StringSplitOptions.RemoveEmptyEntries))
    {
        var idx = part.IndexOf('=');
        var key = idx >= 0 ? part[..idx] : part;
        var value = idx >= 0 ? part[(idx + 1)..] : string.Empty;
        pairs.Add(new KeyValuePair<string, string>(key, value));
    }
    return pairs;
}

private static string BuildSignatureString(List<KeyValuePair<string, string>> pairs)
{
    var sb = new StringBuilder();
    foreach (var (key, value) in pairs)
    {
        if (key == "signature")
            break;
        if (string.IsNullOrEmpty(value))
            continue;
        sb.Append(key).Append('=').Append(value).Append('&');
    }
    if (sb.Length > 0)
        sb.Length--;
    return sb.ToString();
}

private static string BuildValidationString(List<KeyValuePair<string, string>> pairs)
{
    return BuildSignatureString(pairs);
}

private static string GenerateSignatureFromString(string payload, string passphrase)
{
    if (string.IsNullOrEmpty(passphrase))
        return MD5Hash(payload);
    return MD5Hash($"{payload}&passphrase={UrlEncode(passphrase)}");
}
```

(Change `GenerateSignature` to reuse `GenerateSignatureFromString` where appropriate, or keep both. Refactor only after tests pass.)

- [ ] **Step 4: Run tests**

```bash
dotnet test "tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj"
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/DiamantLaan.Api/Models/Dtos/ItnVerificationResult.cs src/DiamantLaan.Api/Services/IPayFastService.cs src/DiamantLaan.Api/Services/PayFastService.cs tests/DiamantLaan.Api.Tests/Services/PayFastServiceTests.cs
git commit -m "feat(payfast): verify PayFast ITN signature and server confirmation"
```

---

## Task 5: Wire up configuration and dependency injection

**Files:**
- Modify: `src/DiamantLaan.Api/appsettings.json`
- Modify: `src/DiamantLaan.Api/Program.cs`

- [ ] **Step 1: Add PayFast section to appsettings.json**

```json
"PayFast": {
  "MerchantId": "",
  "MerchantKey": "",
  "Passphrase": "",
  "Sandbox": true,
  "ProcessUrl": "https://sandbox.payfast.co.za/eng/process",
  "QueryUrl": "https://sandbox.payfast.co.za/eng/query/validate",
  "NotifyUrl": "",
  "SkipIpCheck": true
}
```

- [ ] **Step 2: Register settings, service and HttpClient in Program.cs**

After `builder.Services.AddScoped<AuditLogService>();` add:

```csharp
var payFastSettings = builder.Configuration.GetSection("PayFast").Get<PayFastSettings>()
    ?? new PayFastSettings();

builder.Services.AddSingleton(payFastSettings);
builder.Services.AddHttpClient<IPayFastService, PayFastService>((sp, client) =>
{
    var settings = sp.GetRequiredService<PayFastSettings>();
    client.BaseAddress = new Uri(settings.Sandbox
        ? "https://sandbox.payfast.co.za/"
        : "https://www.payfast.co.za/");
});
```

- [ ] **Step 3: Configure local sandbox secrets**

Run:

```bash
dotnet user-secrets set --project src/DiamantLaan.Api "PayFast:MerchantId" "10000100"
dotnet user-secrets set --project src/DiamantLaan.Api "PayFast:MerchantKey" "46f0cd694581a"
dotnet user-secrets set --project src/DiamantLaan.Api "PayFast:Passphrase" "jt7NOE43FZPn"
```

- [ ] **Step 4: Build the API**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/DiamantLaan.Api/appsettings.json src/DiamantLaan.Api/Program.cs
git commit -m "feat(payfast): register PayFast settings and service in DI"
```

---

## Task 6: Extend the Purchase model and add a migration

**Files:**
- Modify: `src/DiamantLaan.Api/Models/Enums/PaymentStatus.cs`
- Modify: `src/DiamantLaan.Api/Models/Purchase.cs`
- Modify: `src/DiamantLaan.Api/Data/AppDbContext.cs` (only if needed; likely not)
- Create: migration files under `src/DiamantLaan.Api/Migrations/`

- [ ] **Step 1: Add Cancelled and Failed to PaymentStatus**

```csharp
namespace DiamantLaan.Api.Models.Enums;

public enum PaymentStatus
{
    Pending = 0,
    Confirmed = 1,
    Cancelled = 2,
    Failed = 3
}
```

- [ ] **Step 2: Add PayFast tracking fields to Purchase**

```csharp
public class Purchase
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public User User { get; set; } = null!;
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public decimal Amount { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public string? ProofOfPaymentPath { get; set; }

    public string? PayFastPaymentId { get; set; }
    public string? PayFastPaymentStatus { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    public ICollection<PurchaseSquare> PurchaseSquares { get; set; } = new List<PurchaseSquare>();
}
```

- [ ] **Step 3: Create and apply the EF migration**

```bash
dotnet ef migrations add AddPayFastToPurchase --project src/DiamantLaan.Api/DiamantLaan.Api.csproj
```

Then run the API once to apply the migration (or apply explicitly):

```bash
dotnet run --project src/DiamantLaan.Api
```

Stop the API after it starts.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Api/Models/Enums/PaymentStatus.cs src/DiamantLaan.Api/Models/Purchase.cs src/DiamantLaan.Api/Migrations/
git commit -m "feat(payfast): extend Purchase for PayFast tracking and add migration"
```

---

## Task 7: Add backend payment endpoints

**Files:**
- Create: `src/DiamantLaan.Api/Controllers/PaymentController.cs`
- Modify: `src/DiamantLaan.Api/Controllers/PurchaseController.cs`

- [ ] **Step 1: Change PurchaseController to always create a pending purchase**

In `CreatePurchase`, replace:

```csharp
PaymentStatus = dto.ConfirmPayment ? PaymentStatus.Confirmed : PaymentStatus.Pending
```

with:

```csharp
PaymentStatus = PaymentStatus.Pending
```

Keep `dto.ConfirmPayment` on the DTO so older frontends do not break, but ignore it.

- [ ] **Step 2: Add PayFast payment initiation endpoint to PurchaseController**

```csharp
[HttpPost("{id}/pay")]
public async Task<IActionResult> Pay(int id)
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    var purchase = await _db.Purchases
        .Include(p => p.PurchaseSquares)
        .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

    if (purchase == null)
        return NotFound();

    if (purchase.PaymentStatus != PaymentStatus.Pending)
        return BadRequest(new { message = "Aankoop is nie in 'n hangende status nie." });

    var user = await _db.Users.FindAsync(userId);
    if (user == null)
        return Unauthorized();

    var baseUrl = $"{Request.Scheme}://{Request.Host}/";
    var request = _payFastService.CreatePaymentRequest(purchase, user, baseUrl);

    return Ok(request);
}
```

Add `_payFastService` to the controller constructor:

```csharp
private readonly AppDbContext _db;
private readonly IPayFastService _payFastService;

public PurchaseController(AppDbContext db, IPayFastService payFastService)
{
    _db = db;
    _payFastService = payFastService;
}
```

- [ ] **Step 3: Add the cancel endpoint**

```csharp
[HttpPost("{id}/cancel")]
public async Task<IActionResult> Cancel(int id)
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    var purchase = await _db.Purchases
        .Include(p => p.PurchaseSquares)
        .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

    if (purchase == null)
        return NotFound();

    if (purchase.PaymentStatus != PaymentStatus.Pending)
        return BadRequest(new { message = "Aankoop kan nie gekanselleer word nie." });

    foreach (var ps in purchase.PurchaseSquares)
    {
        var square = await _db.Squares.FindAsync(ps.SquareId);
        if (square != null && square.OwnerId == userId)
            square.OwnerId = null;
    }

    purchase.PaymentStatus = PaymentStatus.Cancelled;
    purchase.CancelledAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();

    return Ok(new { purchaseId = purchase.Id, paymentStatus = purchase.PaymentStatus.ToString() });
}
```

- [ ] **Step 4: Create the ITN controller**

`src/DiamantLaan.Api/Controllers/PaymentController.cs`:

```csharp
using System.IO;
using System.Text;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPayFastService _payFastService;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(AppDbContext db, IPayFastService payFastService, ILogger<PaymentController> logger)
    {
        _db = db;
        _payFastService = payFastService;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpPost("itn")]
    public async Task<IActionResult> Itn()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var rawBody = await reader.ReadToEndAsync();

        _logger.LogInformation("PayFast ITN received: {Body}", rawBody);

        var merchantPaymentId = ExtractMerchantPaymentId(rawBody);
        if (string.IsNullOrEmpty(merchantPaymentId) || !int.TryParse(merchantPaymentId, out var purchaseId))
        {
            _logger.LogWarning("PayFast ITN missing merchant payment id");
            return Ok("OK");
        }

        var purchase = await _db.Purchases
            .Include(p => p.PurchaseSquares)
            .FirstOrDefaultAsync(p => p.Id == purchaseId);

        if (purchase == null)
        {
            _logger.LogWarning("PayFast ITN for unknown purchase {PurchaseId}", purchaseId);
            return Ok("OK");
        }

        var result = await _payFastService.VerifyItnAsync(rawBody, purchase.Amount);

        if (!result.IsValid)
        {
            _logger.LogWarning("PayFast ITN validation failed for purchase {PurchaseId}: {Error}", purchaseId, result.Error);
            return Ok("OK");
        }

        if (purchase.PaymentStatus == PaymentStatus.Confirmed)
        {
            _logger.LogInformation("PayFast ITN for already confirmed purchase {PurchaseId}", purchaseId);
            return Ok("OK");
        }

        purchase.PaymentStatus = PaymentStatus.Confirmed;
        purchase.PayFastPaymentId = result.PayFastPaymentId;
        purchase.PayFastPaymentStatus = result.PaymentStatus;
        purchase.ConfirmedAt = DateTime.UtcNow;

        var userId = purchase.UserId;
        foreach (var ps in purchase.PurchaseSquares)
        {
            var square = await _db.Squares.FindAsync(ps.SquareId);
            if (square != null)
                square.OwnerId = userId;
        }

        await _db.SaveChangesAsync();
        _logger.LogInformation("Purchase {PurchaseId} confirmed by PayFast ITN", purchaseId);

        return Ok("OK");
    }

    private static string? ExtractMerchantPaymentId(string rawBody)
    {
        foreach (var part in rawBody.Split('&'))
        {
            var idx = part.IndexOf('=');
            if (idx < 0) continue;
            var key = part[..idx];
            if (key == "m_payment_id")
                return part[(idx + 1)..];
        }
        return null;
    }
}
```

- [ ] **Step 5: Build and run API tests**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
dotnet test tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj
```

Expected: build succeeds and tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/DiamantLaan.Api/Controllers/PurchaseController.cs src/DiamantLaan.Api/Controllers/PaymentController.cs
git commit -m "feat(payfast): add payment initiation and ITN endpoints"
```

---

## Task 8: Add pending reservation cleanup

**Files:**
- Create: `src/DiamantLaan.Api/Services/PendingReservationCleanupService.cs`
- Modify: `src/DiamantLaan.Api/Program.cs`

- [ ] **Step 1: Implement the cleanup hosted service**

```csharp
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Services;

public class PendingReservationCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PendingReservationCleanupService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(5);
    private readonly TimeSpan _expiry = TimeSpan.FromMinutes(30);

    public PendingReservationCleanupService(IServiceScopeFactory scopeFactory, ILogger<PendingReservationCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_checkInterval, stoppingToken);
                await ReleaseExpiredReservationsAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to release expired pending reservations");
            }
        }
    }

    private async Task ReleaseExpiredReservationsAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var cutoff = DateTime.UtcNow.Subtract(_expiry);
        var expired = await db.Purchases
            .Include(p => p.PurchaseSquares)
            .Where(p => p.PaymentStatus == PaymentStatus.Pending && p.PurchaseDate < cutoff)
            .ToListAsync(cancellationToken);

        foreach (var purchase in expired)
        {
            foreach (var ps in purchase.PurchaseSquares)
            {
                var square = await db.Squares.FindAsync(new object[] { ps.SquareId }, cancellationToken);
                if (square != null && square.OwnerId == purchase.UserId)
                    square.OwnerId = null;
            }
            purchase.PaymentStatus = PaymentStatus.Cancelled;
            purchase.CancelledAt = DateTime.UtcNow;
        }

        if (expired.Count > 0)
        {
            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Released {Count} expired pending reservations", expired.Count);
        }
    }
}
```

- [ ] **Step 2: Register the hosted service**

In `Program.cs` after service registrations:

```csharp
builder.Services.AddHostedService<PendingReservationCleanupService>();
```

- [ ] **Step 3: Build the API**

```bash
dotnet build src/DiamantLaan.Api/DiamantLaan.Api.csproj
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/DiamantLaan.Api/Services/PendingReservationCleanupService.cs src/DiamantLaan.Api/Program.cs
git commit -m "feat(payfast): release squares from abandoned pending purchases"
```

---

## Task 9: Update the frontend payment flow

**Files:**
- Modify: `src/DiamantLaan.Web/src/app/services/purchase.service.ts`
- Modify: `src/DiamantLaan.Web/src/app/components/payment/payment.component.ts`
- Create: `src/DiamantLaan.Web/src/app/components/payment-return/payment-return.component.ts`
- Create: `src/DiamantLaan.Web/src/app/components/payment-cancel/payment-cancel.component.ts`
- Modify: `src/DiamantLaan.Web/src/app/app.routes.ts`

- [ ] **Step 1: Update PurchaseService**

Change `createPurchase` to send `confirmPayment: false` and add helper methods:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const PENDING_IDS_KEY = 'pendingSquareIds';
const PENDING_AMOUNT_KEY = 'pendingAmountPerBlock';

export interface PayFastForm {
  actionUrl: string;
  fields: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  constructor(private http: HttpClient) {}

  get pendingSquareIds(): number[] {
    const raw = sessionStorage.getItem(PENDING_IDS_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  set pendingSquareIds(ids: number[]) {
    if (ids.length === 0) {
      sessionStorage.removeItem(PENDING_IDS_KEY);
    } else {
      sessionStorage.setItem(PENDING_IDS_KEY, JSON.stringify(ids));
    }
  }

  get pendingAmountPerBlock(): number {
    const raw = sessionStorage.getItem(PENDING_AMOUNT_KEY);
    return raw ? Number(raw) : 500;
  }

  set pendingAmountPerBlock(amount: number) {
    sessionStorage.setItem(PENDING_AMOUNT_KEY, String(amount || 500));
  }

  createPurchase(squareIds: number[], amount?: number) {
    const body = { squareIds, amount, confirmPayment: false };
    return this.http.post<{ purchaseId: number; amount: number; squareCount: number; paymentStatus: string }>(
      '/api/purchase', body
    );
  }

  getPayFastForm(purchaseId: number) {
    return this.http.post<PayFastForm>(`/api/purchase/${purchaseId}/pay`, {});
  }

  cancelPurchase(purchaseId: number) {
    return this.http.post<{ purchaseId: number; paymentStatus: string }>(`/api/purchase/${purchaseId}/cancel`, {});
  }

  getPurchase(id: number) {
    return this.http.get<{ id: number; amount: number; purchaseDate: string; paymentStatus: string; squares: number[] }>(`/api/purchase/${id}`);
  }

  getMySquares() {
    return this.http.get<{ id: number; status: number; imageCount?: number }[]>('/api/my-squares');
  }

  getMySummary() {
    return this.http.get<{ blockCount: number; totalSpent: number }>('/api/my-squares/summary');
  }
}
```

- [ ] **Step 2: Update PaymentComponent to redirect to PayFast**

Replace `submitPayment()` with:

```typescript
  submitPayment() {
    if (this.squareIds.length === 0) return;
    this.error = '';
    this.loading = true;

    this.purchase.createPurchase(this.squareIds, this.totalAmount).subscribe({
      next: (res) => {
        this.purchase.getPayFastForm(res.purchaseId).subscribe({
          next: (form) => {
            this.loading = false;
            this.postToPayFast(form);
          },
          error: (err) => {
            this.error = err.error?.message || 'Kon nie PayFast betaling voorberei nie.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.error = err.error?.message || 'Aankoop het misluk.';
        this.loading = false;
      }
    });
  }

  private postToPayFast(form: { actionUrl: string; fields: Record<string, string> }) {
    const f = document.createElement('form');
    f.method = 'POST';
    f.action = form.actionUrl;
    f.style.display = 'none';

    for (const [key, value] of Object.entries(form.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      f.appendChild(input);
    }

    document.body.appendChild(f);
    f.submit();
    document.body.removeChild(f);
  }
```

- [ ] **Step 3: Create the return component**

`src/DiamantLaan.Web/src/app/components/payment-return/payment-return.component.ts`:

```typescript
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-payment-return',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="gateway-card">
        @switch (state) {
          @case ('pending') {
            <h2>Wag op betalingsbevestiging</h2>
            <p class="summary">Ons wag vir PayFast om die betaling te bevestig. Moenie hierdie bladsy toemaak nie.</p>
          }
          @case ('success') {
            <div class="success-card">
              <h2>Betaling Suksesvol!</h2>
              <p class="summary">Jou aankoop is bevestig.</p>
              <a routerLink="/my-blokke" class="btn btn-primary btn-wide">Gaan na My Blokke</a>
            </div>
          }
          @case ('failed') {
            <h2>Betaling het misluk</h2>
            <p class="summary">Die betaling is nie voltooi nie. Probeer asseblief weer.</p>
            <a routerLink="/kaart" class="btn btn-primary btn-wide">Terug na kaart</a>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem; }
    .gateway-card { max-width: 460px; margin: 2rem auto; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 2.5rem 2rem; box-shadow: var(--shadow); text-align: center; }
    h2 { font-family: var(--font-heading); font-size: 1.5rem; color: var(--color-text); margin-bottom: 0.75rem; }
    .summary { font-size: 0.9375rem; color: var(--color-muted); margin-bottom: 1.75rem; }
    .btn-wide { min-width: 220px; }
  `]
})
export class PaymentReturnComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private purchase = inject(PurchaseService);

  state: 'pending' | 'success' | 'failed' = 'pending';
  private sub?: Subscription;

  ngOnInit() {
    const purchaseId = Number(this.route.snapshot.queryParamMap.get('purchaseId'));
    if (!purchaseId) {
      this.router.navigate(['/kaart']);
      return;
    }

    this.sub = interval(2000)
      .pipe(takeWhile(() => this.state === 'pending'))
      .subscribe(() => this.checkStatus(purchaseId));

    this.checkStatus(purchaseId);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private checkStatus(purchaseId: number) {
    this.purchase.getPurchase(purchaseId).subscribe({
      next: (p) => {
        if (p.paymentStatus === 'Confirmed') {
          this.state = 'success';
          this.purchase.pendingSquareIds = [];
          this.purchase.pendingAmountPerBlock = 500;
        } else if (p.paymentStatus === 'Failed' || p.paymentStatus === 'Cancelled') {
          this.state = 'failed';
        }
      },
      error: () => {
        this.state = 'failed';
      }
    });
  }
}
```

- [ ] **Step 4: Create the cancel component**

`src/DiamantLaan.Web/src/app/components/payment-cancel/payment-cancel.component.ts`:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PurchaseService } from '../../services/purchase.service';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="gateway-card">
        <h2>Betaling gekanselleer</h2>
        <p class="summary">Jy het die betaling gekanselleer. Jou blokkies is weer beskikbaar.</p>
        <a routerLink="/kaart" class="btn btn-primary btn-wide">Terug na kaart</a>
      </div>
    </div>
  `,
  styles: [`
    .container { padding: 2rem 1.5rem; }
    .gateway-card { max-width: 460px; margin: 2rem auto; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 2.5rem 2rem; box-shadow: var(--shadow); text-align: center; }
    h2 { font-family: var(--font-heading); font-size: 1.5rem; color: var(--color-text); margin-bottom: 0.75rem; }
    .summary { font-size: 0.9375rem; color: var(--color-muted); margin-bottom: 1.75rem; }
    .btn-wide { min-width: 220px; }
  `]
})
export class PaymentCancelComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private purchase = inject(PurchaseService);

  ngOnInit() {
    const purchaseId = Number(this.route.snapshot.queryParamMap.get('purchaseId'));
    if (purchaseId) {
      this.purchase.cancelPurchase(purchaseId).subscribe({
        next: () => {
          this.purchase.pendingSquareIds = [];
          this.purchase.pendingAmountPerBlock = 500;
        },
        error: () => {
          this.purchase.pendingSquareIds = [];
          this.purchase.pendingAmountPerBlock = 500;
        }
      });
    } else {
      this.router.navigate(['/kaart']);
    }
  }
}
```

- [ ] **Step 5: Add the new routes**

In `app.routes.ts` add before the catch-all route:

```typescript
{ path: 'betalings/terug', loadComponent: () => import('./components/payment-return/payment-return.component').then(m => m.PaymentReturnComponent) },
{ path: 'betalings/kanselleer', loadComponent: () => import('./components/payment-cancel/payment-cancel.component').then(m => m.PaymentCancelComponent) },
```

- [ ] **Step 6: Build the Angular app**

```bash
cd src/DiamantLaan.Web
npm install
npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/DiamantLaan.Web/src/app/services/purchase.service.ts src/DiamantLaan.Web/src/app/components/payment/payment.component.ts src/DiamantLaan.Web/src/app/components/payment-return/payment-return.component.ts src/DiamantLaan.Web/src/app/components/payment-cancel/payment-cancel.component.ts src/DiamantLaan.Web/src/app/app.routes.ts
git commit -m "feat(payfast): redirect buyer to PayFast and handle return/cancel"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run all API tests**

```bash
dotnet test tests/DiamantLaan.Api.Tests/DiamantLaan.Api.Tests.csproj
```

Expected: all tests pass.

- [ ] **Step 2: Run a full release build**

```bash
dotnet publish src/DiamantLaan.Api/DiamantLaan.Api.csproj -c Release -o publish
```

Expected: publish succeeds (this also runs the Angular production build).

- [ ] **Step 3: Manual sandbox smoke-test**

1. Start the API: `dotnet run --project src/DiamantLaan.Api`.
2. Start Angular dev server: `cd src/DiamantLaan.Web && ng serve`.
3. Register/login, select squares, go to `/betaal`.
4. Click **Volgende**.
5. You should be redirected to `https://sandbox.payfast.co.za/eng/process`.
6. Log in with sandbox buyer `sbtu01@payfast.io` / `clientpass` and complete payment.
7. For local ITN testing, expose `https://localhost:5001/api/payment/itn` via ngrok or Expose and set `PayFast:NotifyUrl` to the public URL before step 4.
8. After payment, the return page should show success once the ITN is received and the purchase status is `Confirmed`.

- [ ] **Step 4: Commit any final fixes**

---

## Self-Review Checklist

1. **Spec coverage:**
   - Server-side signature generation ✅ Task 2
   - PayFast sandbox process request ✅ Task 3
   - ITN signature + amount + server validation ✅ Task 4
   - No frontend confirmation of payment ✅ frontend only polls server status
   - Reservation cleanup ✅ Task 8
2. **Placeholder scan:** No `TBD`, `TODO`, or "implement later" items remain in the plan.
3. **Type consistency:**
   - `IPayFastService` exposes `CreatePaymentRequest` and `VerifyItnAsync` everywhere.
   - `PayFastSettings` property names match the `appsettings.json` section.
   - `PaymentStatus` enum values used in controller checks are `Pending`, `Confirmed`, `Cancelled`, `Failed`.
