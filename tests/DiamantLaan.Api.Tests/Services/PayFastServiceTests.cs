using System.Net;
using DiamantLaan.Api.Models;
using DiamantLaan.Api.Services;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class TestHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _responder;
    public TestHttpMessageHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> responder) => _responder = responder;
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => _responder(request);
}

public class PayFastServiceTests
{
    private static PayFastService CreateServiceWithResponse(PayFastSettings settings, string responseText)
    {
        var handler = new TestHttpMessageHandler(_ => Task.FromResult(new HttpResponseMessage
        {
            Content = new StringContent(responseText)
        }));
        return new PayFastService(settings, new HttpClient(handler));
    }

    [Fact]
    public void CreateSignature_ReturnsExpectedHash()
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

        var signature = PayFastService.CreateSignature(data, "jt7NOE43FZPn");

        Assert.Equal("a18a81fce9f020f3cc7b901f9b84a5d5", signature);
    }

    [Fact]
    public void CreateSignature_NullData_ThrowsArgumentNullException()
    {
        var ex = Assert.Throws<ArgumentNullException>(
            () => PayFastService.CreateSignature(null!, "jt7NOE43FZPn"));

        Assert.Equal("data", ex.ParamName);
    }

    [Fact]
    public void CreateSignature_EmptyPassphrase_ProducesSignature()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var signature = PayFastService.CreateSignature(data, "");

        Assert.NotNull(signature);
        Assert.NotEmpty(signature);
        // With empty passphrase no "&passphrase=" is appended to the param string
    }

    [Fact]
    public void CreateSignature_NullPassphrase_ProducesSignature()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var signature = PayFastService.CreateSignature(data, null!);

        Assert.NotNull(signature);
        Assert.NotEmpty(signature);
    }

    [Fact]
    public void UrlEncode_SpecialCharacters_EncodedLikePhpUrlencode()
    {
        // PHP urlencode encodes space as +, and percent-encodes ~, *, #, @, and +
        Assert.Equal("hello%2Bworld", PayFastService.UrlEncode("hello+world"));
        Assert.Equal("hello+world", PayFastService.UrlEncode("hello world"));
        Assert.Equal("%7Ehello%7E", PayFastService.UrlEncode("~hello~"));
        Assert.Equal("%2Ahello%2A", PayFastService.UrlEncode("*hello*"));
        Assert.Equal("%23hello%23", PayFastService.UrlEncode("#hello#"));
        Assert.Equal("%40hello%40", PayFastService.UrlEncode("@hello@"));
    }

    [Fact]
    public void CreateSignature_PassphraseWithSpecialCharacters_IsUrlEncoded()
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

        var signature = PayFastService.CreateSignature(data, "my passphrase");

        Assert.Equal("9cec51b520d25a4140fdf4934426afab", signature);
    }

    [Fact]
    public void CreateSignature_IgnoresFieldsNotInCanonicalOrder()
    {
        // Fields not in the PayFast canonical order list should be ignored
        var dataWithExtra = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test",
            ["unknown_field"] = "should-be-ignored",
            ["another_extra"] = "also-ignored"
        };

        var dataWithoutExtra = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var sigWithExtra = PayFastService.CreateSignature(dataWithExtra, "secret");
        var sigWithoutExtra = PayFastService.CreateSignature(dataWithoutExtra, "secret");

        Assert.Equal(sigWithoutExtra, sigWithExtra);
    }

    [Fact]
    public void InstanceCreateSignature_DelegatesToStaticMethod()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var passphrase = "test-passphrase";
        var service = new PayFastService(passphrase);
        var instanceSig = service.CreateSignature(data);
        var staticSig = PayFastService.CreateSignature(data, passphrase);

        Assert.Equal(staticSig, instanceSig);
    }

    [Fact]
    public void CreateSignature_PassphraseWithWhitespace_IsTrimmedBeforeEncoding()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        // Passphrase with leading and trailing whitespace should be trimmed
        var sigTrimmed = PayFastService.CreateSignature(data, "  secret  ");
        var sigClean = PayFastService.CreateSignature(data, "secret");

        Assert.Equal(sigClean, sigTrimmed);
    }

    [Fact]
    public void UrlEncode_NonAsciiCharacters_EncodedAsUtf8ByteSequence()
    {
        // é (U+00E9) → UTF-8: 0xC3 0xA9 → %C3%A9
        Assert.Equal("%C3%A9", PayFastService.UrlEncode("é"));
        // ñ (U+00F1) → UTF-8: 0xC3 0xB1 → %C3%B1
        Assert.Equal("%C3%B1", PayFastService.UrlEncode("ñ"));
    }

    [Fact]
    public void CreateSignature_FieldValueIsZero_IsIncluded()
    {
        var dataWithZero = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "0",
            ["item_name"] = "Test"
        };

        var dataWithoutAmount = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["item_name"] = "Test"
        };

        // string.IsNullOrEmpty("0") returns false, so "amount=0" should be included
        // and produce a different signature than when amount is absent
        var sigWithZero = PayFastService.CreateSignature(dataWithZero, "secret");
        var sigWithoutAmount = PayFastService.CreateSignature(dataWithoutAmount, "secret");

        Assert.NotEqual(sigWithoutAmount, sigWithZero);
    }

    [Fact]
    public void CreatePaymentRequest_IncludesSignedFields()
    {
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            MerchantKey = "46f0cd694581a",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true,
            FrontendBaseUrl = "https://www.example.com/",
            NotifyUrl = "https://www.example.com/api/payment/itn"
        };

        var service = new PayFastService(settings, new HttpClient());

        var purchase = new Purchase { Id = 42, Amount = 200.00m, UserId = "user-1" };
        var user = new User { FirstName = "Test User", LastName = "Doe", Email = "test+user@example.com" };

        var request = service.CreatePaymentRequest(purchase, user, "https://api.example.com/");

        Assert.Equal("https://sandbox.payfast.co.za/eng/process", request.ActionUrl);
        Assert.Equal("10000100", request.Fields["merchant_id"]);
        Assert.Equal("42", request.Fields["m_payment_id"]);
        Assert.Equal("200.00", request.Fields["amount"]);
        Assert.True(request.Fields.ContainsKey("signature"));
        Assert.Matches("^[a-f0-9]{32}$", request.Fields["signature"]);

        Assert.Equal("https://www.example.com/betalings/terug?purchaseId=42", request.Fields["return_url"]);
        Assert.Equal("https://www.example.com/betalings/kanselleer?purchaseId=42", request.Fields["cancel_url"]);
        Assert.Equal("https://www.example.com/api/payment/itn", request.Fields["notify_url"]);
        Assert.Equal("Diamant Laan - Aankoop #42", request.Fields["item_name"]);

        // Signature must match the exact fields we post to PayFast (no empty unsigned fields).
        var fieldsWithoutSignature = request.Fields
            .Where(kv => !kv.Key.Equals("signature", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(kv => kv.Key, kv => kv.Value);
        var expectedSignature = PayFastService.CreateSignature(fieldsWithoutSignature, "jt7NOE43FZPn");
        Assert.Equal(expectedSignature, request.Fields["signature"]);
        Assert.Equal("5f05d3624c9635a30ff3bd807851c743", request.Fields["signature"]);
    }

    [Fact]
    public void CreatePaymentRequest_NullEmail_OmitsEmailFieldFromForm()
    {
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            MerchantKey = "46f0cd694581a",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true,
            FrontendBaseUrl = "https://www.example.com/",
            NotifyUrl = "https://www.example.com/api/payment/itn"
        };

        var service = new PayFastService(settings, new HttpClient());

        var purchase = new Purchase { Id = 42, Amount = 200.00m, UserId = "user-1" };
        var user = new User { FirstName = "Test User", LastName = "Doe", Email = null };

        var request = service.CreatePaymentRequest(purchase, user, "https://api.example.com/");

        Assert.False(request.Fields.ContainsKey("email_address"));

        var fieldsWithoutSignature = request.Fields
            .Where(kv => !kv.Key.Equals("signature", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(kv => kv.Key, kv => kv.Value);
        var expectedSignature = PayFastService.CreateSignature(fieldsWithoutSignature, "jt7NOE43FZPn");
        Assert.Equal(expectedSignature, request.Fields["signature"]);
        Assert.Equal("f6da276f907d8f527cc4d57269c20136", request.Fields["signature"]);
    }

    [Fact]
    public async Task VerifyItnAsync_ValidComplete_ReturnsValid()
    {
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true,

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

    [Fact]
    public async Task VerifyItnAsync_MissingSignature_ReturnsInvalid()
    {
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true,

        };
        var service = CreateServiceWithResponse(settings, "VALID");
        var rawBody = "m_payment_id=42&pf_payment_id=1089250&payment_status=COMPLETE&amount_gross=200.00&merchant_id=10000100";

        var result = await service.VerifyItnAsync(rawBody, 200.00m);

        Assert.False(result.IsValid);
        Assert.Equal("Missing signature", result.Error);
    }

    [Fact]
    public async Task VerifyItnAsync_SignatureMismatch_ReturnsInvalid()
    {
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true,

        };
        var service = CreateServiceWithResponse(settings, "VALID");
        var rawBody = "m_payment_id=42&pf_payment_id=1089250&payment_status=COMPLETE&amount_gross=200.00&merchant_id=10000100&signature=wrong";

        var result = await service.VerifyItnAsync(rawBody, 200.00m);

        Assert.False(result.IsValid);
        Assert.Equal("Signature mismatch", result.Error);
    }

    [Fact]
    public async Task VerifyItnAsync_PaymentNotComplete_ReturnsInvalid()
    {
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true,

        };
        var service = CreateServiceWithResponse(settings, "VALID");
        var rawBody = "m_payment_id=42&pf_payment_id=1089250&payment_status=FAILED&amount_gross=200.00&merchant_id=10000100&signature=b03f5907529b67e15bc49a11ee5d6998";

        var result = await service.VerifyItnAsync(rawBody, 200.00m);

        Assert.False(result.IsValid);
        Assert.Equal("Payment not complete", result.Error);
        Assert.Equal("FAILED", result.PaymentStatus);
    }

    [Fact]
    public async Task VerifyItnAsync_AmountMismatch_ReturnsInvalid()
    {
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true,

        };
        var service = CreateServiceWithResponse(settings, "VALID");
        var rawBody = "m_payment_id=42&pf_payment_id=1089250&payment_status=COMPLETE&amount_gross=500.00&merchant_id=10000100&signature=81f275685a244b98a3cd2da01765fe54";

        var result = await service.VerifyItnAsync(rawBody, 200.00m);

        Assert.False(result.IsValid);
        Assert.Equal("Amount mismatch", result.Error);
        Assert.Equal(500.00m, result.AmountGross);
    }

    [Fact]
    public async Task VerifyItnAsync_ServerConfirmationInvalid_ReturnsInvalid()
    {
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true,

        };
        var service = CreateServiceWithResponse(settings, "INVALID");
        var rawBody = "m_payment_id=42&pf_payment_id=1089250&payment_status=COMPLETE&item_name=Order%2342&amount_gross=200.00&amount_fee=-4.60&amount_net=195.40&name_first=Test&name_last=User&email_address=test%40example.com&merchant_id=10000100&signature=4d0496272ebc6f4dd29353bbd71af08b";

        var result = await service.VerifyItnAsync(rawBody, 200.00m);

        Assert.False(result.IsValid);
        Assert.Equal("Server confirmation failed", result.Error);
    }

    [Fact]
    public async Task VerifyItnAsync_WithEmptyFields_ReturnsValid()
    {
        // Real PayFast ITN payloads include empty optional fields as "key=" and the
        // signature is computed over them. See issue: empty fields must not be skipped.
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true,
        };

        var service = CreateServiceWithResponse(settings, "VALID");
        var rawBody = "m_payment_id=12&pf_payment_id=3257838&payment_status=COMPLETE&item_name=Diamant+Laan+-+Aankoop+%2312&item_description=&amount_gross=500.00&amount_fee=-11.50&amount_net=488.50&custom_str1=&custom_str2=&custom_str3=&custom_str4=&custom_str5=&custom_int1=&custom_int2=&custom_int3=&custom_int4=&custom_int5=&name_first=Admin&name_last=Diamant&email_address=admin%40diamantlaan.co.za&merchant_id=10000100&signature=ab60487e69eaa0296a835f8225d96fe1";

        var result = await service.VerifyItnAsync(rawBody, 500.00m);

        Assert.True(result.IsValid);
        Assert.Equal("COMPLETE", result.PaymentStatus);
        Assert.Equal("3257838", result.PayFastPaymentId);
        Assert.Equal("12", result.MerchantPaymentId);
    }
}
